"use client";

import {
  generateDailySales,
  getRevenueByCountry,
  getTotalMembers,
  getTotalPointsInCirculation,
  getOrdersByStatus,
  locations,
  brasaPointsMembers,
  recentOrders,
} from "../../lib/data";
import KPICard from "../../components/KPICard";
import SalesChart from "../../components/SalesChart";
import RevenueByCountry from "../../components/RevenueByCountry";
import RecentOrdersTable from "../../components/RecentOrdersTable";
import TopMembersList from "../../components/TopMembersList";

export default function DashboardPage() {
  const sales = generateDailySales();
  const revenueByCountry = getRevenueByCountry(sales);
  const ordersByStatus = getOrdersByStatus();
  const totalRevenue = revenueByCountry["Colombia"] + revenueByCountry["United States"];
  const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);

  // Last 7 days revenue for trend
  const last7DaysSales = sales.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
  });
  const last7DaysRevenue = last7DaysSales.reduce((acc, s) => acc + s.revenue, 0);

  // Previous 7 days
  const prev7DaysSales = sales.filter((s) => {
    const d = new Date(s.date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 14 * 24 * 60 * 60 * 1000;
  });
  const prev7DaysRevenue = prev7DaysSales.reduce((acc, s) => acc + s.revenue, 0);

  const revenueTrend = prev7DaysRevenue > 0
    ? ((last7DaysRevenue - prev7DaysRevenue) / prev7DaysRevenue) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          Brasaland operations overview — September 2026
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue (30d)"
          value={`$${totalRevenue.toLocaleString()}`}
          subtitle="USD equivalent"
          trend={revenueTrend}
          icon="💰"
        />
        <KPICard
          title="Total Orders (30d)"
          value={totalOrders.toLocaleString()}
          subtitle={`Across ${locations.length} locations`}
          trend={5.2}
          icon="📋"
        />
        <KPICard
          title="Active Members"
          value={getTotalMembers().toLocaleString()}
          subtitle="Brasa Points program"
          trend={12.8}
          icon="👥"
        />
        <KPICard
          title="Points in Circulation"
          value={getTotalPointsInCirculation().toLocaleString()}
          subtitle="Pending redemption"
          icon="⭐"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart sales={sales} />
        </div>
        <RevenueByCountry revenue={revenueByCountry} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentOrdersTable orders={recentOrders} locations={locations} />
        <TopMembersList members={brasaPointsMembers} />
      </div>
    </div>
  );
}
