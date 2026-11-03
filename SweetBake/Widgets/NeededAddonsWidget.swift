//
//  NeededAddonsWidget.swift
//  SweetBakeWidgets
//
//  Apple HIG Compliant Checklist Widget:
//  - Displays needed cake toppers, fresh flowers, and photo prints
//  - Uses standard layout metrics with clean typography hierarchy
//  - Supports systemSmall and systemMedium families
//  - Supports interactive Link targets
//

import WidgetKit
import SwiftUI

struct NeededAddonsEntry: TimelineEntry {
    let date: Date
    let data: NeededAddonsWidgetData
}

struct NeededAddonsProvider: TimelineProvider {
    func placeholder(in context: Context) -> NeededAddonsEntry {
        NeededAddonsEntry(date: Date(), data: .sample)
    }

    func getSnapshot(in context: Context, completion: @escaping (NeededAddonsEntry) -> Void) {
        let data = SweetBakeWidgetStorage.loadNeededAddons()
        completion(NeededAddonsEntry(date: Date(), data: data))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NeededAddonsEntry>) -> Void) {
        let data = SweetBakeWidgetStorage.loadNeededAddons()
        let currentDate = Date()
        let entry = NeededAddonsEntry(date: currentDate, data: data)
        
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: currentDate) ?? currentDate
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Widget Views

struct NeededAddonsWidgetView: View {
    @Environment(\.widgetFamily) var family
    var entry: NeededAddonsEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallAddonsView(data: entry.data)
        default:
            MediumAddonsView(data: entry.data)
        }
    }
}

// Small Size
private struct SmallAddonsView: View {
    let data: NeededAddonsWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Header
            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 11))
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                    Text("Add-ons")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                Spacer()
                Text("\(data.totalPendingCount)")
                    .font(.system(size: 12, weight: .heavy, design: .rounded))
                    .foregroundStyle(Color("DeepRose", bundle: nil))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color("BlushPink", bundle: nil))
                    .clipShape(Capsule())
            }

            Spacer()

            // Top items list
            let pendingItems = data.items.filter { !$0.isCompleted }
            if pendingItems.isEmpty {
                VStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(.green)
                    Text("All Prepped!")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                .frame(maxWidth: .infinity)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(pendingItems.prefix(2)) { item in
                        HStack(spacing: 5) {
                            Circle()
                                .strokeBorder(Color("PastelRose", bundle: nil), lineWidth: 1.5)
                                .frame(width: 10, height: 10)
                            Text(item.title)
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .lineLimit(1)
                        }
                    }
                    
                    if pendingItems.count > 2 {
                        Text("+\(pendingItems.count - 2) more items")
                            .font(.system(size: 10, weight: .semibold, design: .rounded))
                            .foregroundStyle(.secondary)
                            .padding(.leading, 15)
                    }
                }
            }
        }
        .widgetURL(URL(string: "sweetbake://checklist?category=addons"))
    }
}

// Medium Size
private struct MediumAddonsView: View {
    let data: NeededAddonsWidgetData

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header Row
            HStack {
                HStack(spacing: 6) {
                    ZStack {
                        Circle()
                            .fill(Color("BlushPink", bundle: nil))
                            .frame(width: 24, height: 24)
                        Image(systemName: "sparkles")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(Color("DeepRose", bundle: nil))
                    }
                    
                    Text("Needed Cake Add-ons")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                }
                
                Spacer()
                
                Text("\(data.totalPendingCount) to prepare")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Divider()
                .opacity(0.3)

            // Items List Grid
            let pendingItems = data.items.filter { !$0.isCompleted }
            
            if pendingItems.isEmpty {
                HStack {
                    Spacer()
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(Color("DeepRose", bundle: nil))
                    Text("All cake toppers, florals, and prints ready!")
                        .font(.system(size: 13, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(pendingItems.prefix(3)) { item in
                        HStack(spacing: 8) {
                            Circle()
                                .strokeBorder(Color("PastelRose", bundle: nil), lineWidth: 2)
                                .frame(width: 14, height: 14)
                            
                            Text(item.title)
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .lineLimit(1)
                            
                            Spacer()
                        }
                    }
                }
            }
        }
        .widgetURL(URL(string: "sweetbake://checklist?category=addons"))
    }
}

// MARK: - Widget Declaration

public struct NeededAddonsWidget: Widget {
    public static let kind: String = "NeededAddonsWidget"

    public init() {}

    public var body: some WidgetConfiguration {
        StaticConfiguration(kind: Self.kind, provider: NeededAddonsProvider()) { entry in
            NeededAddonsWidgetView(entry: entry)
                .containerBackground(for: .widget) {
                    Color("Cream", bundle: nil)
                }
        }
        .configurationDisplayName("Needed Cake Add-ons")
        .description("Quick checklist of cake toppers, flowers, and photo prints needed for commissions.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
