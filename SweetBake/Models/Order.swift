//
//  Order.swift
//  SweetBake
//

import Foundation
import SwiftData

enum OrderStatus: String, Codable, CaseIterable, Identifiable {
    case pending = "Pending"
    case baking = "Baking"
    case decorating = "Decorating"
    case delivered = "Delivered"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .pending: return "clock.fill"
        case .baking: return "flame.fill"
        case .decorating: return "wand.and.stars"
        case .delivered: return "checkmark.seal.fill"
        }
    }
    
    var nextStatus: OrderStatus? {
        switch self {
        case .pending: return .baking
        case .baking: return .decorating
        case .decorating: return .delivered
        case .delivered: return nil
        }
    }
}

@Model
final class Order {
    var id: UUID = UUID()
    var customerName: String = ""
    var deliveryDate: Date = Date()
    var cakeType: String = ""
    var shape: String = ""
    var flavor: String = ""
    var customRequirements: String = ""
    var statusRaw: String = OrderStatus.pending.rawValue
    var quotedPrice: Double = 0.0
    var referenceImages: [Data] = []
    
    var status: OrderStatus {
        get { OrderStatus(rawValue: statusRaw) ?? .pending }
        set { statusRaw = newValue.rawValue }
    }
    
    init(
        id: UUID = UUID(),
        customerName: String,
        deliveryDate: Date,
        cakeType: String,
        shape: String,
        flavor: String,
        customRequirements: String = "",
        status: OrderStatus = .pending,
        quotedPrice: Double = 0.0,
        referenceImages: [Data] = []
    ) {
        self.id = id
        self.customerName = customerName
        self.deliveryDate = deliveryDate
        self.cakeType = cakeType
        self.shape = shape
        self.flavor = flavor
        self.customRequirements = customRequirements
        self.statusRaw = status.rawValue
        self.quotedPrice = quotedPrice
        self.referenceImages = referenceImages
    }
}

