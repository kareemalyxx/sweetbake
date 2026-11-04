import SwiftUI

// MARK: - Premium Native iOS Revenue Tracker Card
public struct RevenueTrackerView: View {
    public let orders: [Order]
    
    public init(orders: [Order]) {
        self.orders = orders
    }
    
    private var currentMonthOrders: [Order] {
        let calendar = Calendar.current
        let now = Date()
        return orders.filter { order in
            calendar.isDate(order.deliveryDate, equalTo: now, toGranularity: .month)
        }
    }
    
    private var pendingRevenue: Double {
        currentMonthOrders
            .filter { $0.status != .delivered }
            .reduce(0) { $0 + $1.quotedPrice }
    }
    
    private var completedRevenue: Double {
        currentMonthOrders
            .filter { $0.status == .delivered }
            .reduce(0) { $0 + $1.quotedPrice }
    }
    
    private var totalRevenue: Double {
        pendingRevenue + completedRevenue
    }
    
    private var fulfilledPercent: Int {
        guard totalRevenue > 0 else { return 0 }
        return Int((completedRevenue / totalRevenue) * 100)
    }
    
    public var body: some View {
        VStack(spacing: 14) {
            // Header Row
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(Theme.Colors.deepRose)
                            .font(.headline)
                        
                        Text("\(Date().formatted(.dateTime.month(.wide))) Revenue")
                            .font(.headline)
                            .foregroundColor(Theme.Colors.textDark)
                    }
                    
                    Text("Total: $\(totalRevenue, specifier: "%.2f")")
                        .font(.subheadline)
                        .foregroundColor(Theme.Colors.textSecondary)
                }
                
                Spacer()
                
                if totalRevenue > 0 {
                    Text("\(fulfilledPercent)% Fulfilled")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Theme.Colors.lavenderLight)
                        .foregroundColor(Theme.Colors.softLilac)
                        .clipShape(Capsule())
                }
            }
            
            // Native Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Theme.Colors.warmIvory)
                        .frame(height: 8)
                    
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Theme.Colors.pastelRose, Theme.Colors.deepRose],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * CGFloat(min(1.0, Double(fulfilledPercent) / 100.0)), height: 8)
                }
            }
            .frame(height: 8)
            
            // Sub-metrics Split Cards
            HStack(spacing: 12) {
                // Pipeline Metric
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Theme.Colors.Status.pending)
                            .frame(width: 34, height: 34)
                        Image(systemName: "hourglass")
                            .symbolRenderingMode(.hierarchical)
                            .font(.footnote)
                            .foregroundColor(Theme.Colors.Status.pendingDark)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("In Pipeline")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.Colors.textSecondary)
                        Text("$\(pendingRevenue, specifier: "%.2f")")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.Colors.textDark)
                    }
                    Spacer()
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.Colors.warmIvory)
                )
                
                // Delivered Metric
                HStack(spacing: 10) {
                    ZStack {
                        Circle()
                            .fill(Theme.Colors.Status.delivered)
                            .frame(width: 34, height: 34)
                        Image(systemName: "checkmark")
                            .symbolRenderingMode(.hierarchical)
                            .font(.footnote)
                            .foregroundColor(Theme.Colors.Status.deliveredDark)
                    }
                    
                    VStack(alignment: .leading, spacing: 1) {
                        Text("Delivered")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundColor(Theme.Colors.textSecondary)
                        Text("$\(completedRevenue, specifier: "%.2f")")
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(Theme.Colors.textDark)
                    }
                    Spacer()
                }
                .padding(10)
                .background(
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.Colors.warmIvory)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Theme.Colors.secondaryBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Theme.Colors.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
}
