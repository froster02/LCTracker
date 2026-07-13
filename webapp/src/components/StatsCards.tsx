"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Trophy, Target, Zap } from "lucide-react";

interface UserStats {
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  currentStreak: number;
  longestStreak: number;
  acceptanceRate: number;
}

interface StatsCardsProps {
  stats: UserStats | null;
  totalSubmissions: number;
  acceptedSubmissions: number;
}

export function StatsCards({ stats, totalSubmissions, acceptedSubmissions }: StatsCardsProps) {
  const safeStats = stats ?? {
    totalSolved: 0,
    easySolved: 0,
    mediumSolved: 0,
    hardSolved: 0,
    currentStreak: 0,
    longestStreak: 0,
    acceptanceRate: 0,
  };

  const cards = [
    {
      label: "Problems Solved",
      value: safeStats.totalSolved,
      sub: `${acceptedSubmissions} accepted / ${totalSubmissions} total`,
      icon: Trophy,
      color: "text-lc-easy",
      bg: "bg-lc-easy/10",
    },
    {
      label: "Current Streak",
      value: `${safeStats.currentStreak}d`,
      sub: `Best: ${safeStats.longestStreak}d`,
      icon: Flame,
      color: "text-lc-orange",
      bg: "bg-lc-orange/10",
    },
    {
      label: "Easy / Med / Hard",
      value: `${safeStats.easySolved} / ${safeStats.mediumSolved} / ${safeStats.hardSolved}`,
      sub: "Difficulty breakdown",
      icon: Target,
      color: "text-lc-medium",
      bg: "bg-lc-medium/10",
    },
    {
      label: "Acceptance Rate",
      value: `${safeStats.acceptanceRate}%`,
      sub: `${acceptedSubmissions} / ${totalSubmissions} submissions`,
      icon: Zap,
      color: "text-lc-hard",
      bg: "bg-lc-hard/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
                <div className={`rounded-lg p-1.5 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
