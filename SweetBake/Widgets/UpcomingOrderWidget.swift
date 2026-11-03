//
//  UpcomingOrderWidget.swift
//  SweetBakeWidgets
//
//  Apple Human Interface Guidelines (HIG) Compliant Widget:
//  - Glanceable, content-rich design with dynamic typography
//  - Uses system background (.containerBackground)
//  - Adaptive color contrast in Light and Dark mode
//  - Supports systemSmall and systemMedium families
//  - Direct deep linking with .widgetURL
//

import WidgetKit
import SwiftUI

struct UpcomingOrderEntry: TimelineEntry {
    let date: Date
    let order: UpcomingOrderWidgetData?
}

struct UpcomingOrderProvider: TimelineProvider {
    func placeholder(in context: Context) -> UpcomingOrderEntry {
        UpcomingOrderEntry(date: Date(), order: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (UpcomingOrderEntry) -> Void) {
        let order = SweetBakeWidgetStorage.loadUpcomingOrder() ?? .sample
        completion(UpcomingOrderEntry(date: Date(), order: order))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UpcomingOrderEntry>) -> Void) {
        let order = SweetBakeWidgetStorage.loadUpcomingOrder()
        let currentDate = Date()
        let entry = UpcomingOrderEntry(date: currentDate, order: order)
        
        // Refresh every 30 minutes or when order delivery passes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget Views

struct UpcomingOrderWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: UpcomingOrderEntry

    var body: some View {
        if let order = entry.order {
            switch family {
            case .systemSmall:
                SmallUpcomingOrderView(order: order)
            default:
                MediumUpcomingOrderView(order: order)
            }
        } else {
            EmptyUpcomingOrderView()
        }
    }
}

// Small Size (2x2 grid cell)
private struct SmallUpcomingOrderView: View {
    let order: UpcomingOrderWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header: Status badge & Sparkle icon
            HStack {
                StatusBadge(status: order.status)
                Spacer()
                Image(systemName: "birthday.cake.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(Color("PastelRose", bundle: nil))
            }
            
            Spacer()
            
            // Customer Name & Cake Type
            Text(order.customerName)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .lineLimit(1)
            
            Text(order.cakeType)
                .font(.system(size: 11, weight: .medium, design: .rounded))
                .foregroundStyle(.secondary)
                .lineLimit(1)
            
            // Delivery Date & Time (Live countdown/relative)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Image(systemName: "clock.fill")
                        .font(.system(size: 9))
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                    Text(order.deliveryDate, style: .time)
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                
                Text(order.deliveryDate, style: .relative)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(Color("DeepRose", bundle: nil))
            }
            .padding(.top, 2)
        }
        .widgetURL(URL(string: "sweetbake://order/\(order.id)"))
    }
}

// Medium Size (2x4 grid cell)
private struct MediumUpcomingOrderView: View {
    let order: UpcomingOrderWidgetData

    var body: some View {
        HStack(spacing: 14) {
            // Left decorative hero card
            VStack(alignment: .leading, spacing: 6) {
                StatusBadge(status: order.status)
                
                Spacer()
                
                Image(systemName: "calendar.badge.clock")
                    .font(.system(size: 20))
                    .foregroundStyle(Color("DeepRose", bundle: nil))
                
                Text(order.deliveryDate, format: .dateTime.month(.abbreviated).day())
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                
                Text(order.deliveryDate, style: .time)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .frame(width: 90)
            .padding(10)
            .background(Color("BlushPink", bundle: nil).opacity(0.45))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            
            // Right Details
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(order.customerName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .lineLimit(1)
                    Spacer()
                    Text("$\(Int(order.price))")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                }
                
                Text(order.cakeType)
                    .font(.system(size: 13, weight: .medium, design: .rounded))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                
                if !order.flavor.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(Color("PastelRose", bundle: nil))
                        Text(order.flavor)
                            .font(.system(size: 11, weight: .medium, design: .rounded))
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                
                Spacer()
                
                // Countdown highlight
                HStack(spacing: 4) {
                    Image(systemName: "hourglass.bottomhalf.filled")
                        .font(.system(size: 10))
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                    Text("Due in \(order.deliveryDate, style: .relative)")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                }
            }
        }
        .widgetURL(URL(string: "sweetbake://order/\(order.id)"))
    }
}

// Empty State View
private struct EmptyUpcomingOrderView: View {
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: "sparkles")
                .font(.system(size: 24))
                .foregroundStyle(Color("PastelRose", bundle: nil))
            Text("No Pending Bakes")
                .font(.system(size: 14, weight: .bold, design: .rounded))
            Text("All sweet orders fulfilled!")
                .font(.system(size: 11, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .multilineTextAlignment(.center)
    }
}

// Status Pill component for Widget
private struct StatusBadge: View {
    let status: String
    
    var body: some View {
        Text(status.uppercased())
            .font(.system(size: 8, weight: .heavy, design: .rounded))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Color("DeepRose", bundle: nil).opacity(0.18))
            .foregroundStyle(Color("DeepRose", bundle: nil))
            .clipShape(Capsule())
    }
}

// MARK: - Widget Declaration

public struct UpcomingOrderWidget: Widget {
    public static let kind: String = "UpcomingOrderWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: UpcomingOrderProvider()) { entry in
            UpcomingOrderWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color("Cream", bundle: nil)
                }
        }
        .configurationDisplayName("Upcoming Cake Order")
        .description("Track the client, delivery time, and status of your next bake.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
