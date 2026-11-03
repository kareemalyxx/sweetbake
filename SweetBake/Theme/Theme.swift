//
//  Theme.swift
//  SweetBake
//

import SwiftUI

enum Theme {
    // Primary Feminine Pastel Palette
    static let blushPink = Color(red: 250/255, green: 228/255, blue: 232/255)
    static let pastelRose = Color(red: 244/255, green: 184/255, blue: 196/255)
    static let deepRose = Color(red: 219/255, green: 112/255, blue: 147/255)
    static let roseGold = Color(red: 183/255, green: 110/255, blue: 121/255)
    
    static let cream = Color(red: 254/255, green: 251/255, blue: 246/255)
    static let warmIvory = Color(red: 247/255, green: 243/255, blue: 236/255)
    
    static let lavenderLight = Color(red: 240/255, green: 235/255, blue: 248/255)
    static let lavenderAccent = Color(red: 194/255, green: 178/255, blue: 228/255)
    static let softLilac = Color(red: 165/255, green: 140/255, blue: 195/255)
    
    // Status colors
    static let pendingOrange = Color(red: 250/255, green: 214/255, blue: 165/255)
    static let pendingOrangeDark = Color(red: 204/255, green: 120/255, blue: 40/255)
    
    static let bakingBlue = Color(red: 197/255, green: 225/255, blue: 245/255)
    static let bakingBlueDark = Color(red: 70/255, green: 130/255, blue: 180/255)
    
    static let decoratingPurple = Color(red: 228/255, green: 205/255, blue: 245/255)
    static let decoratingPurpleDark = Color(red: 142/255, green: 68/255, blue: 173/255)
    
    static let deliveredGreen = Color(red: 200/255, green: 236/255, blue: 214/255)
    static let deliveredGreenDark = Color(red: 46/255, green: 139/255, blue: 87/255)

    // Typography & Contrast Text
    static let textDark = Color(red: 44/255, green: 40/255, blue: 48/255)       // Deep Charcoal
    static let textMauve = Color(red: 90/255, green: 72/255, blue: 88/255)      // Deep Mauve
    static let textSecondary = Color(red: 140/255, green: 125/255, blue: 135/255)
    
    // Gradients
    static let headerGradient = LinearGradient(
        colors: [blushPink, lavenderLight],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let cardGradient = LinearGradient(
        colors: [Color.white, cream],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let roseGoldGradient = LinearGradient(
        colors: [Color(red: 224/255, green: 148/255, blue: 159/255), roseGold],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // Corner Radii
    static let cornerRadiusCard: CGFloat = 20
    static let cornerRadiusButton: CGFloat = 16
    static let cornerRadiusPill: CGFloat = 12
    static let cornerRadiusField: CGFloat = 14
}

// Bouncy & tactile scale button style
struct ScaleButtonStyle: ButtonStyle {
    var scaleAmount: CGFloat = 0.96
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scaleAmount : 1.0)
            .animation(.spring(response: 0.25, dampingFraction: 0.65), value: configuration.isPressed)
    }
}

extension View {
    func sweetCardStyle(padding: CGFloat = 16) -> some View {
        self
            .padding(padding)
            .background(Theme.cardGradient)
            .clipShape(RoundedRectangle(cornerRadius: Theme.cornerRadiusCard, style: .continuous))
            .shadow(color: Theme.textDark.opacity(0.06), radius: 10, x: 0, y: 5)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.cornerRadiusCard, style: .continuous)
                    .stroke(Theme.pastelRose.opacity(0.2), lineWidth: 1)
            )
    }
}

