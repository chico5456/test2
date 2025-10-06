/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

type Queen = {
    id: string;
    name: string;
    placements: { episodeNumber: number | string; placement: string }[];
    wins: number;
    highs: number;
    lows: number;
    bottoms: number;
    isEliminated: boolean;
};

type SeasonTrackRecordChartProps = {
    queens: Queen[];
    episodes: { episodeNumber: number | string; title: string }[];
};

import { TooltipProps } from "recharts";

const placementValueToLabel: Record<number, string> = {
    7: "WINNER",
    6: "RUNNER-UP",
    5: "WIN",
    4.5: "TOP2",
    4: "HIGH",
    3: "SAFE",
    2: "LOW",
    1: "BTM2",
    0: "OUT"
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border rounded p-2 shadow">
                <div className="font-bold">{label}</div>
                {payload.map((entry, idx) => (
                    <div key={idx} style={{ color: entry.color }}>
                        {entry.name}: {placementValueToLabel[entry.value as number]}
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const SeasonTrackRecordChart = ({ queens, episodes }: SeasonTrackRecordChartProps) => {
    const finaleEpNum = Math.max(...episodes.map(ep => Number(ep.episodeNumber)));

    // Map placements to numeric values
    const placementValue = (placement: string) => {
        switch (placement) {
            case "WINNER": return 7;
            case "RUNNER-UP": return 6;
            case "win": return 5;
            case "top2": return 4.5;
            case "high": return 4;
            case "safe": return 3;
            case "low": return 2;
            case "bottom":
            case "BTM2": return 1;
            case "OUT": return 0;
            default: return 0;
        }
    };

    // Reverse mapping for Y-axis labels
    const valueToLabel = (val: number) => {
        switch (val) {
            case 7: return "WINNER";
            case 6: return "RUNNER-UP";
            case 5: return "WIN";
            case 4.5: return "TOP2";
            case 4: return "HIGH";
            case 3: return "SAFE";
            case 2: return "LOW";
            case 1: return "BTM2";
            case 0: return "OUT";
            default: return "";
        }
    };

    // Transform data for Recharts
    const chartData = episodes.map(ep => {
        const dataPoint: any = { episode: `EP${ep.episodeNumber}` };

        queens.forEach(q => {
            const epNum = Number(ep.episodeNumber);
            const p = q.placements.find(pl => Number(pl.episodeNumber) === epNum);
            let placement = p?.placement;

            // Handle finale first
            if (epNum === finaleEpNum && !q.isEliminated) {
                const finalePlacement = q.placements.find(pl => Number(pl.episodeNumber) === finaleEpNum)?.placement;
                if (finalePlacement === "win") placement = "WINNER";
                else placement = "RUNNER-UP";
            }

            // Default for eliminated queens if no placement
            if (!placement) placement = q.isEliminated ? "OUT" : "safe";

            // Stop line after elimination
            const elimEp = q.isEliminated ? Number(q.placements.at(-1)?.episodeNumber) : null;
            dataPoint[q.name] =
                elimEp !== null && epNum > elimEp
                    ? null
                    : placementValue(placement);
        });

        return dataPoint;
    });


    const colors = [
        "#f59e0b",
        "#ef4444",
        "#3b82f6",
        "#10b981",
        "#8b5cf6",
        "#f97316",
        "#ec4899",
        "#14b8a6",
        "#e11d48",
        "#2563eb",
        "#facc15",
        "#22c55e",
        "#7c3aed",
        "#f43f5e"
    ];

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Season Placements</CardTitle>
                <CardDescription>Track record over all episodes</CardDescription>
            </CardHeader>
            <CardContent>
                <LineChart
                    width={1000}
                    height={400}
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="episode" />
                    <YAxis
                        type="number"
                        domain={[0, 7]}
                        ticks={[0, 1, 2, 3, 4, 4.5, 5, 6, 7]}
                        tickFormatter={valueToLabel}
                    />
                    <Tooltip />
                    <Legend />
                    {queens.map((q, idx) => (
                        <Line
                            key={q.id}
                            dataKey={q.name}
                            type="monotone"
                            stroke={colors[idx % colors.length]}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                        />
                    ))}
                </LineChart>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex gap-2 leading-none font-medium">
                    {/*Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />*/}
                </div>
                <div className="text-muted-foreground leading-none">
                    Showing placements over the season
                </div>
            </CardFooter>
        </Card>
    );
};

export default SeasonTrackRecordChart;
