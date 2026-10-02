"use client";

import { useState } from "react";
import { recentOrders, locations, Location } from "../../lib/data";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  preparing: "bg-blue-100 text-blue-800 border-blue-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  delivered: "bg-gray-100 text-gray-600 border-gray-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusEmoji: Record<string, string> = {
  pending: "⏳",
  preparing: "🔥",
  ready: "✅",
  delivered: "📦",
  cancelled: "❌",
};

export default function OrdersPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");

  const filtered = recentOrders.filter((order) => {
    if (filterStatus !== "all" && order.status !== filterStatus) return false;
    if (filterCountry !== "all") {
      const loc = locations.find((l) => l.id === order.locationId);
      if (!loc || loc.country !== filterCountry) return false;
    }
    return true;
  });

  function getLocation(orderLocationId: string): Location | undefined {
    return locations.find((l) => l.id === orderLocationId);
  }

  const statusCounts = {
    pending: recentOrders.filter((o) => o.status === "pending").length,
    preparing: recentOrders.filter((o) => o.status === "preparing").length,
    ready: recentOrders.filter((o) => o.status === "ready").length,
    delivered: recentOrders.filter((o) => o.status === "delivered").length,
    cancelled: recentOrders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500">
          Order traceability across all locations
        </p>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
            className={`rounded-xl border p-4 text-center transition-all ${
              filterStatus === status
                ? "ring-2 ring-brasa-red border-brasa-red"
                : "border-gray-200 hover:border-gray-300"
            } bg-white shadow-sm`}
          >
            <span className="text-2xl">{statusEmoji[status]}</span>
            <p className="mt-1 text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-xs font-medium capitalize text-gray-500">{status}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">Country</label>
          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brasa-red focus:outline-none"
          >
            <option value="all">All Countries</option>
            <option value="Colombia">🇨🇴 Colombia</option>
            <option value="United States">🇺🇸 United States</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
            No orders match the selected filters.
          </p>
        )}
        {filtered.map((order) => {
          const location = getLocation(order.locationId);
          const isUSD = location?.country === "United States";
          const time = new Date(order.timestamp);
          const timeStr = time.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div
              key={order.id}
              className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center"
            >
              {/* Order Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-gray-900">{order.id}</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[order.status]}`}
                  >
                    {statusEmoji[order.status]} {order.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">{order.customerName}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {location?.name} · {location?.city}, {location?.country}
                </p>
              </div>

              {/* Items */}
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500">Items</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {order.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {/* Total & Time */}
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">
                  {isUSD ? `$${order.total}` : `$${order.total.toLocaleString()}`}
                </p>
                <p className="text-xs text-gray-400">{timeStr}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
