//
//  RevenueTrackerView.swift
//  SweetBake
//

import SwiftUI

struct RevenueTrackerView: View {
    let orders: [Order]
    
    private var currentMonthOrders: [Order] {
        let calendar = Calendar.current
        let now = Date()
        return orders.filter {
            calendar.isDate($0.deliveryDate, equalTo: now, toGranularity: .month) &&
            calendar.isDate($0.deliveryDate, equalTo: now, toGranularity: .year)
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
    
    private var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.string(from: Date())
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .foregroundColor(Theme.deepRose)
                        Text("\(monthName) Revenue")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(Theme.textDark)
                    }
                    Text("Total: \(totalRevenue, format: .currency(code: "USD"))")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(Theme.textSecondary)
                }
                Spacer()
                
                // Monthly progress pill
                if totalRevenue > 0 {
                    let percent = Int((completedRevenue / totalRevenue) * 100)
                    Text("\(percent)% Fulfilled")
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Theme.lavenderLight)
                        .foregroundColor(Theme.softLilac)
                        .clipShape(Capsule())
                }
            }
            
            // Progress Bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Theme.lavenderLight.opacity(0.6))
                        .frame(height: 8)
                    
                    if totalRevenue > 0 {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(
                                LinearGradient(
                                    colors: [Theme.deliveredGreenDark, Theme.deliveredGreen],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: geo.size.width * CGFloat(completedRevenue / totalRevenue), height: 8)
                            .animation(.spring(response: 0.5), value: completedRevenue)
                    }
                }
            }
            .frame(height: 8)
            
            // Financial breakdown cards
            HStack(spacing: 12) {
                // Pending card
                HStack(spacing: 10) {
                    Circle()
                        .fill(Theme.pendingOrange)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Image(systemName: "hourglass")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Theme.pendingOrangeDark)
                        )
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("In Pipeline")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(Theme.textSecondary)
                        Text(pendingRevenue, format: .currency(code: "USD"))
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(Theme.textDark)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Color.white.opacity(0.8))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                
                // Completed card
                HStack(spacing: 10) {
                    Circle()
                        .fill(Theme.deliveredGreen)
                        .frame(width: 32, height: 32)
                        .overlay(
                            Image(systemName: "checkmark")
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(Theme.deliveredGreenDark)
                        )
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Delivered")
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(Theme.textSecondary)
                        Text(completedRevenue, format: .currency(code: "USD"))
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(Theme.textDark)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(10)
                .background(Color.white.opacity(0.8))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
        }
        .sweetCardStyle()
    }
}

