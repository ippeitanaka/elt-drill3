import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  return NextResponse.json({ ok: true, api: 'save-questions', version: 'v3-minimal-insert', supportsMinimalInsert: true })
}

export async function POST(request: NextRequest) {
  try {
    // 環境変数の事前検証（明示的なエラーメッセージを返す）
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !service) {
      return NextResponse.json(
        { error: 'Server Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (missing in this deployment).', missing: { NEXT_PUBLIC_SUPABASE_URL: !url, SUPABASE_SERVICE_ROLE_KEY: !service } },
        { status: 500 }
      )
    }

    const adminClient = createServerClient()
    const body = await request.json()
    const { categoryId, questions } = body

    if (!categoryId || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Category ID and questions array are required' },
        { status: 400 }
      )
    }

    // 既存セットをカテゴリで再利用（最新1件）し、なければ作成
    const { data: existingSets, error: findErr } = await adminClient
      .from('question_sets')
      .select('id, created_at')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (findErr) {
      console.warn('Find question set error (ignored):', findErr)
    }

    let questionSetId: any
    if (existingSets && existingSets.length > 0) {
      questionSetId = existingSets[0].id
    } else {
      // 最小フィールドで作成 → name 必須環境ならフォールバックで name を付与
      const { data: newSet, error: setError } = await adminClient
        .from('question_sets')
        .insert({ category_id: categoryId })
        .select()
        .single()

      if (setError) {
        const msg = (setError.message || '').toLowerCase()
        const isNameNotNull = msg.includes('column "name"') && (msg.includes('not-null') || msg.includes('violates'))
        if (isNameNotNull) {
          const safeName = (body?.title ? String(body.title).slice(0, 100) : `OCRセット ${new Date().toLocaleString('ja-JP')}`)
          const { data: newSet2, error: setError2 } = await adminClient
            .from('question_sets')
            .insert({ category_id: categoryId, name: safeName })
            .select()
            .single()
          if (setError2) {
            console.error('Question set creation error (with name):', setError2)
            return NextResponse.json(
              { error: `Question set creation error: ${setError2.message}`, code: setError2.code, details: setError2.details },
              { status: 500 }
            )
          }
          questionSetId = newSet2!.id
        } else {
          console.error('Question set creation error:', setError)
          return NextResponse.json(
            { error: `Question set creation error: ${setError.message}`, code: setError.code, details: setError.details },
            { status: 500 }
          )
        }
      } else {
        questionSetId = newSet!.id
      }
    }

    // 受信データログ（安全化）
    console.log('Save questions API - 受信:', {
      categoryId,
      questionsCount: questions.length,
    })

    // 質問を現在スキーマに合わせて整形
    const toUpperAnswer = (ans: any) => {
      if (!ans) return 'A'
      const s = String(ans).trim().toUpperCase()
      return ['A','B','C','D','E'].includes(s) ? s : 'A'
    }

    const questionsFull = questions.map((q: any, idx: number) => {
      const choices = q.choices || []
      const option_a = (choices[0] ?? q.option_a ?? '').toString()
      const option_b = (choices[1] ?? q.option_b ?? '').toString()
      const option_c = (choices[2] ?? q.option_c ?? '').toString()
      const option_d = (choices[3] ?? q.option_d ?? '').toString()
      const option_e = (choices[4] ?? q.option_e ?? '').toString()
      const question_text = (q.question_text ?? '').toString()
      return {
        question_set_id: questionSetId,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        option_e,
        correct_answer: toUpperAnswer(q.correct_answer),
        difficulty: q.difficulty ?? 'medium',
        explanation: q.explanation ?? null,
        order_index: (q.order_index as number) ?? idx + 1,
      }
    })

    // サニタイズ: question_text が空のものは除外
    const sanitized = questionsFull.filter((q) => {
      const qt = (q.question_text || '').toString().trim()
      return qt.length > 0
    })

    if (sanitized.length === 0) {
      return NextResponse.json({ error: 'No valid questions to insert (all question_text empty).' }, { status: 400 })
    }

    // 1) 5択スキーマで挿入を試みる
    const { error: insertErr } = await adminClient.from('questions').insert(sanitized)
    if (insertErr) {
      console.error('Questions insert error (5択想定):', insertErr)

      // 2) 最小列(5択)のみで再試行（difficulty, explanation, order_index 除去）
      const minimal5 = sanitized.map((q: any, i: number) => ({
        question_set_id: q.question_set_id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        option_e: q.option_e,
        correct_answer: q.correct_answer,
        // 並び順カラムが order_index ではなく question_number の環境向け
        question_number: q.order_index ?? (i + 1),
      }))
      const { error: minimal5Err } = await adminClient.from('questions').insert(minimal5)
      if (minimal5Err) {
        console.error('Questions insert error (5択最小列):', minimal5Err)

        // 3) options + correct_answers で再試行（JSON → 文字列）
        try {
          const asOptions = sanitized.map((q: any) => ({
            question_set_id: q.question_set_id,
            question_text: q.question_text,
            options: {
              a: q.option_a || '',
              b: q.option_b || '',
              c: q.option_c || '',
              d: q.option_d || '',
              e: q.option_e || ''
            },
            correct_answers: [String(q.correct_answer || 'A').toUpperCase()]
          }))
          const { error: optionsErr } = await adminClient.from('questions').insert(asOptions)
          if (optionsErr) {
            console.error('Questions insert error (options JSON フォールバック失敗):', optionsErr)
            const asString = asOptions.map((q: any) => ({
              ...q,
              options: JSON.stringify(q.options),
              correct_answers: JSON.stringify(q.correct_answers)
            }))
            const { error: stringErr } = await adminClient.from('questions').insert(asString)
            if (stringErr) {
              console.error('Questions insert error (options/answers 文字列フォールバックも失敗):', stringErr)
              return NextResponse.json(
                { error: `Questions insert error: ${stringErr.message}`, code: stringErr.code, details: stringErr.details },
                { status: 500 }
              )
            }
          }
        } catch (e: any) {
          console.error('Unexpected error during options/correct_answers fallback:', e)
          return NextResponse.json(
            { error: e?.message || 'Unexpected error during options/correct_answers fallback' },
            { status: 500 }
          )
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { questionSetId, questionsCount: sanitized.length },
      message: `${sanitized.length}問をデータベースに保存しました。`
    })

  } catch (error: any) {
    console.error('Save questions API error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
