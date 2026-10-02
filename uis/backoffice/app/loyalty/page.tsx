"use client";

import { brasaPointsMembers, locations } from "../../lib/data";

export default function LoyaltyPage() {
  // Aggregate stats
  const totalMembers = brasaPointsMembers.length;
  const totalPointsIssued = brasaPointsMembers.reduce((acc, m) => acc + m.totalPoints, 0);
  const totalPointsRedeemed = brasaPointsMembers.reduce((acc, m) => acc + m.redeemedPoints, 0);
  const redemptionRate = totalPointsIssued > 0
    ? (totalPointsRedeemed / totalPointsIssued) * 100
    : 0;

  // Country breakdown
  const colombiaMembers = brasaPointsMembers.filter((m) => m.country === "Colombia");
  const usMembers = brasaPointsMembers.filter((m) => m.country === "United States");

  // City breakdown
  const cityBreakdown: Record<string, { members: number; points: number }> = {};
  for (const member of brasaPointsMembers) {
    if (!cityBreakdown[member.city]) cityBreakdown[member.city] = { members: 0, points: 0 };
    cityBreakdown[member.city].members++;
    cityBreakdown[member.city].points += member.totalPoints;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Brasa Points</h1>
        <p className="text-sm text-gray-500">
          Loyalty program analytics and member management
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Total Members (sample)</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalMembers}</p>
          <p className="mt-1 text-xs text-gray-400">
            🇨🇴 {colombiaMembers.length} COL · 🇺🇸 {usMembers.length} US
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Points Issued</p>
          <p className="mt-2 text-3xl font-bold text-brasa-brown">
            {totalPointsIssued.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">Accumulated by members</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Points Redeemed</p>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {totalPointsRedeemed.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {redemptionRate.toFixed(1)}% redemption rate
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Avg Points / Member</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {Math.round(totalPointsIssued / totalMembers).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-gray-400">Per active member</p>
        </div>
      </div>

      {/* City Breakdown */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Members by City</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(cityBreakdown)
            .sort((a, b) => b[1].members - a[1].members)
            .map(([city, data]) => {
              const maxMembers = Math.max(...Object.values(cityBreakdown).map((c) => c.members));
              const barWidth = (data.members / maxMembers) * 100;
              return (
                <div key={city} className="text-center">
                  <div className="relative mx-auto mb-2 h-24 w-full max-w-[60px]">
                    <div
                      className="absolute bottom-0 left-0 right-0 rounded-t bg-brasa-red/80"
                      style={{ height: `${barWidth}%` }}
                    />
                    <span className="absolute bottom-1 left-0 right-0 text-xs font-bold text-white">
                      {data.members}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-gray-700">{city}</p>
                  <p className="text-[10px] text-gray-400">
                    {data.points.toLocaleString()} pts
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Member Directory</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
                <th className="pb-3 pr-4">Member</th>
                <th className="pb-3 pr-4">Location</th>
                <th className="pb-3 pr-4 text-right">Total Points</th>
                <th className="pb-3 pr-4 text-right">Redeemed</th>
                <th className="pb-3 pr-4 text-right">Available</th>
                <th className="pb-3">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brasaPointsMembers
                .sort((a, b) => b.totalPoints - a.totalPoints)
                .map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-3 pr-4">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-400">{member.email}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-gray-500">
                      {member.favoriteLocation}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-bold text-brasa-brown">
                      {member.totalPoints.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right text-gray-400">
                      {member.redeemedPoints.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-right font-medium text-green-600">
                      {(member.totalPoints - member.redeemedPoints).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap py-3 text-gray-400">
                      {member.lastVisit}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
