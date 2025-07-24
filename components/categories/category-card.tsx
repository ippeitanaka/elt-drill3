import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Category } from "@/lib/types"
import {
  Heart,
  Pill,
  LigatureIcon as Bandage,
  TreesIcon as Lungs,
  HeartPulse,
  Stethoscope,
  Activity,
  Brain,
} from "lucide-react"
import Link from "next/link"

const iconMap = {
  "heart-pulse": HeartPulse,
  pill: Pill,
  bandage: Bandage,
  lungs: Lungs,
  heart: Heart,
  stethoscope: Stethoscope,
  activity: Activity,
  brain: Brain,
}

const colorMap = {
  red: "bg-red-100 text-red-700 border-red-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  green: "bg-green-100 text-green-700 border-green-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
}

interface CategoryCardProps {
  category: Category
}

export function CategoryCard({ category }: CategoryCardProps) {
  const IconComponent = iconMap[category.icon as keyof typeof iconMap] || HeartPulse
  const colorClass = colorMap[category.color as keyof typeof colorMap] || colorMap.blue

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <Badge variant="secondary">{category.total_questions}問</Badge>
        </div>
        <CardTitle className="text-lg">{category.name}</CardTitle>
        <CardDescription className="text-sm">{category.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild className="w-full">
          <Link href={`/quiz/${category.id}`}>学習を開始</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
