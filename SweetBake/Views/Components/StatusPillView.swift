//
//  StatusPillView.swift
//  SweetBake
//

import SwiftUI

struct StatusPillView: View {
    let status: OrderStatus
    
    private var backgroundColor: Color {
        switch status {
        case .pending:
            return Theme.pendingOrange.opacity(0.85)
        case .baking:
            return Theme.bakingBlue.opacity(0.85)
        case .decorating:
            return Theme.decoratingPurple.opacity(0.85)
        case .delivered:
            return Theme.deliveredGreen.opacity(0.85)
        }
    }
    
    private var textColor: Color {
        switch status {
        case .pending:
            return Theme.pendingOrangeDark
        case .baking:
            return Theme.bakingBlueDark
        case .decorating:
            return Theme.decoratingPurpleDark
        case .delivered:
            return Theme.deliveredGreenDark
        }
    }
    
    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: status.iconName)
                .symbolRenderingMode(.hierarchical)
                .font(.system(size: 11, weight: .bold))
            Text(status.rawValue)
                .font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(backgroundColor)
        .foregroundColor(textColor)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(textColor.opacity(0.2), lineWidth: 1)
        )
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

