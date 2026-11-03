//
//  GeneralRequirement.swift
//  SweetBake
//

import Foundation
import SwiftData

enum RequirementCategory: String, Codable, CaseIterable, Identifiable {
    case ingredients = "Ingredients"
    case packaging = "Packaging"
    case tools = "Tools"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .ingredients: return "takeoutbag.and.cup.and.straw.fill"
        case .packaging: return "shippingbox.fill"
        case .tools: return "wrench.and.screwdriver.fill"
        }
    }
}

@Model
final class GeneralRequirement {
    var id: UUID = UUID()
    var title: String = ""
    var categoryRaw: String = RequirementCategory.ingredients.rawValue
    var isCompleted: Bool = false
    var createdAt: Date = Date()
    
    var category: RequirementCategory {
        get { RequirementCategory(rawValue: categoryRaw) ?? .ingredients }
        set { categoryRaw = newValue.rawValue }
    }
    
    init(
        id: UUID = UUID(),
        title: String,
        category: RequirementCategory = .ingredients,
        isCompleted: Bool = false,
        createdAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.categoryRaw = category.rawValue
        self.isCompleted = isCompleted
        self.createdAt = createdAt
    }
}

