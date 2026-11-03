//
//  WidgetDataModels.swift
//  SweetBake
//
//  Shared lightweight data transfer models between SweetBake and WidgetKit extension.
//  Uses shared App Group UserDefaults for instant, reliable widget updates.
//

import Foundation

public struct UpcomingOrderWidgetData: Codable {
    public let id: String
    public let customerName: String
    public let cakeType: String
    public let deliveryDate: Date
    public let flavor: String
    public let status: String
    public let price: Double
    
    public init(
        id: String,
        customerName: String,
        cakeType: String,
        deliveryDate: Date,
        flavor: String,
        status: String,
        price: Double
    ) {
        self.id = id
        self.customerName = customerName
        self.cakeType = cakeType
        self.deliveryDate = deliveryDate
        self.flavor = flavor
        self.status = status
        self.price = price
    }
    
    public static let sample = UpcomingOrderWidgetData(
        id: "sample-1",
        customerName: "Eleanor Vance",
        cakeType: "Vintage Heart Cake",
        deliveryDate: Calendar.current.date(byAdding: .hour, value: 4, to: Date()) ?? Date(),
        flavor: "Vanilla Bean & Berry",
        status: "Baking",
        price: 95.0
    )
}

public struct AddonItemWidgetData: Codable, Identifiable {
    public let id: String
    public let title: String
    public let isCompleted: Bool
    
    public init(id: String, title: String, isCompleted: Bool) {
        self.id = id
        self.title = title
        self.isCompleted = isCompleted
    }
}

public struct NeededAddonsWidgetData: Codable {
    public let items: [AddonItemWidgetData]
    public let totalPendingCount: Int
    
    public init(items: [AddonItemWidgetData], totalPendingCount: Int) {
        self.items = items
        self.totalPendingCount = totalPendingCount
    }
    
    public static let sample = NeededAddonsWidgetData(
        items: [
            AddonItemWidgetData(id: "1", title: "Custom Acrylic Topper (Eleanor)", isCompleted: false),
            AddonItemWidgetData(id: "2", title: "Fresh Edible Flowers (Liam & Chloe)", isCompleted: false),
            AddonItemWidgetData(id: "3", title: "Gold Leaf Accents", isCompleted: false),
            AddonItemWidgetData(id: "4", title: "Glitter Candle Pack", isCompleted: true)
        ],
        totalPendingCount: 3
    )
}

public enum SweetBakeWidgetStorage {
    public static let appGroupIdentifier = "group.com.sweetbake.studio"
    private static let upcomingOrderKey = "sweetbake_widget_upcoming_order"
    private static let neededAddonsKey = "sweetbake_widget_needed_addons"
    
    private static var sharedDefaults: UserDefaults {
        UserDefaults(suiteName: appGroupIdentifier) ?? .standard
    }
    
    public static func saveUpcomingOrder(_ order: UpcomingOrderWidgetData?) {
        if let order = order, let data = try? JSONEncoder().encode(order) {
            sharedDefaults.set(data, forKey: upcomingOrderKey)
        } else {
            sharedDefaults.removeObject(forKey: upcomingOrderKey)
        }
    }
    
    public static func loadUpcomingOrder() -> UpcomingOrderWidgetData? {
        guard let data = sharedDefaults.data(forKey: upcomingOrderKey),
              let order = try? JSONDecoder().decode(UpcomingOrderWidgetData.self, from: data) else {
            return nil
        }
        return order
    }
    
    public static func saveNeededAddons(_ data: NeededAddonsWidgetData) {
        if let encoded = try? JSONEncoder().encode(data) {
            sharedDefaults.set(encoded, forKey: neededAddonsKey)
        }
    }
    
    public static func loadNeededAddons() -> NeededAddonsWidgetData {
        guard let data = sharedDefaults.data(forKey: neededAddonsKey),
              let decoded = try? JSONDecoder().decode(NeededAddonsWidgetData.self, from: data) else {
            return NeededAddonsWidgetData.sample
        }
        return decoded
    }
}

