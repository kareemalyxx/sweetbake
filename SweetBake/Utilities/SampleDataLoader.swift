//
//  SampleDataLoader.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct SampleDataLoader {
    static func insertSampleDataIfNeeded(context: ModelContext) {
        let orderDescriptor = FetchDescriptor<Order>()
        let orderCount = (try? context.fetchCount(orderDescriptor)) ?? 0
        
        guard orderCount == 0 else { return }
        
        let now = Date()
        let calendar = Calendar.current
        
        // Sample Orders
        let sampleOrders: [Order] = [
            Order(
                customerName: "Eleanor Vance",
                deliveryDate: calendar.date(byAdding: .day, value: 1, to: now) ?? now,
                cakeType: "Vintage Heart Cake",
                shape: "Heart",
                flavor: "Vanilla Bean & Berry",
                customRequirements: "Pastel blush piping with cherry on top, cursive 'Happy 25th' in deep mauve script.",
                status: .baking,
                quotedPrice: 95.0
            ),
            Order(
                customerName: "Liam & Chloe",
                deliveryDate: calendar.date(byAdding: .day, value: 3, to: now) ?? now,
                cakeType: "Tiered Wedding Cake",
                shape: "Multi-tiered",
                flavor: "Lemon Lavender Curd",
                customRequirements: "3-tier textured buttercream with pressed edible florals and gold leaf flakes.",
                status: .pending,
                quotedPrice: 380.0
            ),
            Order(
                customerName: "Seraphina Lin",
                deliveryDate: calendar.date(byAdding: .day, value: 5, to: now) ?? now,
                cakeType: "Bento Box Cake",
                shape: "Round",
                flavor: "Pistachio Rosewater",
                customRequirements: "Minimalist Korean aesthetic, cute hand-piped ribbon bow design.",
                status: .pending,
                quotedPrice: 48.0
            ),
            Order(
                customerName: "Marcus Sterling",
                deliveryDate: calendar.date(byAdding: .day, value: -2, to: now) ?? now,
                cakeType: "Celebration Cake",
                shape: "Round",
                flavor: "Rich Belgian Chocolate",
                customRequirements: "Chocolate drip with macarons on top.",
                status: .delivered,
                quotedPrice: 110.0
            )
        ]
        
        for order in sampleOrders {
            context.insert(order)
        }
        
        // Sample General Requirements
        let sampleRequirements: [GeneralRequirement] = [
            // Ingredients
            GeneralRequirement(title: "Organic Madagascar Vanilla Beans (x10)", category: .ingredients, isCompleted: false),
            GeneralRequirement(title: "Callebaut 70% Dark Chocolate Callets (2.5kg)", category: .ingredients, isCompleted: false),
            GeneralRequirement(title: "Unsalted French Butter (5kg block)", category: .ingredients, isCompleted: true),
            GeneralRequirement(title: "Culinary Lavender Buds", category: .ingredients, isCompleted: false),
            
            // Packaging
            GeneralRequirement(title: "10-inch White Window Cake Boxes (pack of 25)", category: .packaging, isCompleted: false),
            GeneralRequirement(title: "Mauve Satin Ribbons 1.5-inch rolls", category: .packaging, isCompleted: false),
            GeneralRequirement(title: "Bento Clamshell Boxes (Sugarcane pulp)", category: .packaging, isCompleted: true),
            
            // Tools
            GeneralRequirement(title: "Wilton 1M Open Star Piping Tip", category: .tools, isCompleted: false),
            GeneralRequirement(title: "Stainless Steel Cake Turntable (Re-oil bearings)", category: .tools, isCompleted: true),
            GeneralRequirement(title: "Offset Icing Spatula (8 inch)", category: .tools, isCompleted: false)
        ]
        
        for req in sampleRequirements {
            context.insert(req)
        }
        
        try? context.save()
    }
}

