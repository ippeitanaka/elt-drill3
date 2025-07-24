-- Supabaseストレージの設定
-- Supabaseダッシュボードで実行してください

-- PDFファイル用のバケットを作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', false);

-- ストレージポリシーの設定
-- 認証済みユーザーがPDFをアップロードできるように
CREATE POLICY "Authenticated users can upload PDFs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs');

-- 認証済みユーザーがPDFを読み取れるように
CREATE POLICY "Authenticated users can read PDFs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'pdfs');

-- 管理者がPDFを削除できるように
CREATE POLICY "Admins can delete PDFs" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'pdfs' AND 
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

SELECT 'ストレージ設定が完了しました。' as message;
