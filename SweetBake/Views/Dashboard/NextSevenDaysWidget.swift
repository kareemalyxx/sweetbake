//
//  NextSevenDaysWidget.swift
//  SweetBake
//

import SwiftUI

struct NextSevenDaysWidget: View {
    let orders: [Order]
    
    private var nextSevenDaysCount: Int {
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        guard let sevenDaysLater = calendar.date(byAdding: .day, value: 7, to: startOfToday) else { return 0 }
        
        return orders.filter { order in
            order.deliveryDate >= startOfToday && order.deliveryDate <= sevenDaysLater && order.status != .delivered
        }.count
    }
    
    // Group next 7 days daily summaries
    private var upcomingDays: [(date: Date, count: Int)] {
        let calendar = Calendar.current
        let startOfToday = calendar.startOfDay(for: Date())
        
        return (0..<7).compactMap { dayOffset in
            guard let day = calendar.date(byAdding: .day, value: dayOffset, to: startOfToday) else { return nil }
            let count = orders.filter { order in
                calendar.isDate(order.deliveryDate, inSameDayAs: day) && order.status != .delivered
            }.count
            return (date: day, count: count)
        }
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "flame.fill")
                            .foregroundColor(Theme.deepRose)
                        Text("Next 7 Days Rush")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundColor(Theme.textDark)
                    }
                    Text(nextSevenDaysCount == 1 ? "1 bake due this week" : "\(nextSevenDaysCount) bakes due this week")
                        .font(.system(size: 12, weight: .medium, design: .rounded))
                        .foregroundColor(Theme.textSecondary)
                }
                
                Spacer()
                
                ZStack {
                    Circle()
                        .fill(Theme.blushPink)
                        .frame(width: 36, height: 36)
                    
                    Text("\(nextSevenDaysCount)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.deepRose)
                }
            }
            
            // 7-day pill timeline
            HStack(spacing: 8) {
                ForEach(upcomingDays, id: \.date) { item in
                    let isToday = Calendar.current.isDateInToday(item.date)
                    let dayLetter = item.date.formatted(.dateTime.weekday(.narrow))
                    let dayNumber = item.date.formatted(.dateTime.day())
                    
                    VStack(spacing: 4) {
                        Text(dayLetter)
                            .font(.system(size: 10, weight: .bold, design: .rounded))
                            .foregroundColor(isToday ? Theme.deepRose : Theme.textSecondary)
                        
                        Text(dayNumber)
                            .font(.system(size: 13, weight: isToday ? .bold : .medium, design: .rounded))
                            .foregroundColor(isToday ? Theme.deepRose : Theme.textDark)
                        
                        Circle()
                            .fill(item.count > 0 ? Theme.deepRose : Color.clear)
                            .frame(width: 6, height: 6)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(isToday ? Theme.blushPink.opacity(0.8) : Color.white.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(isToday ? Theme.pastelRose : Color.clear, lineWidth: 1.5)
                    )
                }
            }
        }
        .sweetCardStyle()
    }
}

