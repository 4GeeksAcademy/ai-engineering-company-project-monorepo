import { Order, Location } from "../lib/data";

interface RecentOrdersTableProps {
  orders: Order[];
  locations: Location[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  preparing: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function RecentOrdersTable({ orders, locations }: RecentOrdersTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
        <a href="/orders" className="text-sm font-medium text-brasa-red hover:underline">
          View all →
        </a>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-500">
              <th className="pb-3 pr-4">Order</th>
              <th className="pb-3 pr-4">Customer</th>
              <th className="pb-3 pr-4">Location</th>
              <th className="pb-3 pr-4 text-right">Total</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.slice(0, 6).map((order) => {
              const location = locations.find((l) => l.id === order.locationId);
              const isUSD = location?.country === "United States";
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-3 pr-4 font-medium text-gray-900">
                    {order.id}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-gray-600">
                    {order.customerName}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-gray-500">
                    {location?.name ?? "Unknown"}
                  </td>
                  <td className="whitespace-nowrap py-3 pr-4 text-right font-medium text-gray-900">
                    {isUSD ? `$${order.total}` : `$${order.total.toLocaleString()}`}
                  </td>
                  <td className="whitespace-nowrap py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusColors[order.status]}`}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
