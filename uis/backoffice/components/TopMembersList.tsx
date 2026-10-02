import { BrasaPointsMember } from "../lib/data";

interface TopMembersListProps {
  members: BrasaPointsMember[];
}

export default function TopMembersList({ members }: TopMembersListProps) {
  // Sort by total points descending
  const sorted = [...members].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Top Brasa Points Members</h3>
        <a href="/loyalty" className="text-sm font-medium text-brasa-red hover:underline">
          View all →
        </a>
      </div>

      <ul className="space-y-3">
        {sorted.slice(0, 6).map((member, i) => {
          const available = member.totalPoints - member.redeemedPoints;
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2);

          return (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brasa-gold text-xs font-bold text-brasa-brown">
                {i + 1}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brasa-red/10 text-sm font-semibold text-brasa-red">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{member.name}</p>
                <p className="text-xs text-gray-400">
                  {member.city}, {member.country}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-brasa-brown">
                  {available.toLocaleString()} pts
                </p>
                <p className="text-[10px] text-gray-400">
                  {member.redeemedPoints.toLocaleString()} redeemed
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
