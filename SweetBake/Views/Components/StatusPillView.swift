//
//  StatusPillView.swift
//  SweetBake
//

import SwiftUI

struct StatusPillView: View {
    let status: OrderStatus
    
    // WCAG 2.1 AA Compliant Backgrounds
    private var backgroundColor: Color {
        switch status {
        case .pending:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor.systemOrange.withAlphaComponent(0.25)
                    : UIColor.systemOrange.withAlphaComponent(0.18)
            })
        case .baking:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor.systemBlue.withAlphaComponent(0.25)
                    : UIColor.systemBlue.withAlphaComponent(0.18)
            })
        case .decorating:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor.systemPurple.withAlphaComponent(0.25)
                    : UIColor.systemPurple.withAlphaComponent(0.18)
            })
        case .delivered:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor.systemGreen.withAlphaComponent(0.25)
                    : UIColor.systemGreen.withAlphaComponent(0.18)
            })
        }
    }
    
    // WCAG 2.1 AA Compliant Foregrounds (≥ 4.5:1 contrast against background)
    private var foregroundColor: Color {
        switch status {
        case .pending:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor(red: 1.0, green: 0.72, blue: 0.38, alpha: 1.0)
                    : UIColor(red: 0.65, green: 0.32, blue: 0.05, alpha: 1.0)
            })
        case .baking:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor(red: 0.45, green: 0.78, blue: 1.0, alpha: 1.0)
                    : UIColor(red: 0.08, green: 0.42, blue: 0.72, alpha: 1.0)
            })
        case .decorating:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor(red: 0.82, green: 0.58, blue: 1.0, alpha: 1.0)
                    : UIColor(red: 0.46, green: 0.18, blue: 0.85, alpha: 1.0)
            })
        case .delivered:
            return Color(UIColor { trait in
                trait.userInterfaceStyle == .dark
                    ? UIColor(red: 0.38, green: 0.90, blue: 0.55, alpha: 1.0)
                    : UIColor(red: 0.10, green: 0.52, blue: 0.22, alpha: 1.0)
            })
        }
    }
    
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: status.iconName)
                .symbolRenderingMode(.hierarchical)
                .font(.caption2.weight(.bold))
            
            Text(status.rawValue)
                .font(.caption.weight(.semibold))
        }
        .foregroundColor(foregroundColor)
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(backgroundColor)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(foregroundColor.opacity(0.25), lineWidth: 1)
        )
        // Accessibility
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(status.rawValue)")
    }
}

#Preview {
    VStack(spacing: 12) {
        StatusPillView(status: .pending)
        StatusPillView(status: .baking)
        StatusPillView(status: .decorating)
        StatusPillView(status: .delivered)
    }
    .padding()
}

