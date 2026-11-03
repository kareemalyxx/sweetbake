//
//  OrderRowView.swift
//  SweetBake
//

import SwiftUI

struct OrderRowView: View {
    let order: Order
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: order.deliveryDate)
    }
    
    private var relativeDay: String {
        let calendar = Calendar.current
        if calendar.isDateInToday(order.deliveryDate) {
            return "Today"
        } else if calendar.isDateInTomorrow(order.deliveryDate) {
            return "Tomorrow"
        } else {
            let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: Date()), to: calendar.startOfDay(for: order.deliveryDate)).day ?? 0
            if days > 0 {
                return "in \(days)d"
            } else if days < 0 {
                return "\(-days)d ago"
            }
            return ""
        }
    }
    
    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            // Thumbnail or Icon
            ZStack {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(Theme.lavenderLight)
                    .frame(width: 58, height: 58)
                
                if let firstData = order.referenceImages.first, let uiImage = UIImage(data: firstData) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 58, height: 58)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else {
                    Image(systemName: "birthday.cake.fill")
                        .font(.system(size: 24))
                        .foregroundColor(Theme.softLilac)
                }
            }
            
            // Middle Details
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(order.customerName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.textDark)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text(order.quotedPrice, format: .currency(code: "USD"))
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
                
                Text("\(order.cakeType) • \(order.shape)")
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundColor(Theme.textSecondary)
                    .lineLimit(1)
                
                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textSecondary)
                    
                    Text(formattedDate)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundColor(Theme.textSecondary)
                    
                    if !relativeDay.isEmpty {
                        Text("(\(relativeDay))")
                            .font(.system(size: 11, weight: .semibold, design: .rounded))
                            .foregroundColor(Theme.deepRose)
                    }
                }
                
                HStack {
                    StatusPillView(status: order.status)
                    
                    if !order.flavor.isEmpty {
                        Text(order.flavor)
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Color.black.opacity(0.04))
                            .clipShape(Capsule())
                    }
                    
                    if order.referenceImages.count > 1 {
                        HStack(spacing: 2) {
                            Image(systemName: "photo.stack")
                                .font(.system(size: 10))
                            Text("+\(order.referenceImages.count - 1)")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundColor(Theme.textSecondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
    }
}

