//
//  EmptyStateView.swift
//  SweetBake
//

import SwiftUI

struct EmptyCakeStandIllustration: View {
    var body: some View {
        ZStack {
            // Soft glowing aura
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Theme.blushPink.opacity(0.8), Theme.lavenderLight.opacity(0.1)],
                        center: .center,
                        startRadius: 20,
                        endRadius: 80
                    )
                )
                .frame(width: 160, height: 160)
            
            // Stylized Cake Stand & Cloche Illustration
            VStack(spacing: 0) {
                // Glass Cloche handle
                Circle()
                    .stroke(Theme.pastelRose, lineWidth: 3)
                    .frame(width: 14, height: 14)
                
                // Cloche Dome
                UnevenRoundedRectangle(
                    topLeadingRadius: 36,
                    bottomLeadingRadius: 4,
                    bottomTrailingRadius: 4,
                    topTrailingRadius: 36
                )
                .fill(
                    LinearGradient(
                        colors: [Color.white.opacity(0.8), Theme.lavenderLight.opacity(0.5)],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
                .frame(width: 76, height: 44)
                .overlay(
                    UnevenRoundedRectangle(
                        topLeadingRadius: 36,
                        bottomLeadingRadius: 4,
                        bottomTrailingRadius: 4,
                        topTrailingRadius: 36
                    )
                    .stroke(Theme.pastelRose.opacity(0.6), lineWidth: 2)
                )
                
                // Cake Plate Platform
                RoundedRectangle(cornerRadius: 4)
                    .fill(Theme.roseGold)
                    .frame(width: 94, height: 7)
                    .shadow(color: Theme.roseGold.opacity(0.3), radius: 3, y: 2)
                
                // Stand Stem
                Rectangle()
                    .fill(Theme.roseGold.opacity(0.85))
                    .frame(width: 12, height: 20)
                
                // Stand Base
                UnevenRoundedRectangle(
                    topLeadingRadius: 8,
                    bottomLeadingRadius: 14,
                    bottomTrailingRadius: 14,
                    topTrailingRadius: 8
                )
                .fill(Theme.roseGold)
                .frame(width: 54, height: 10)
            }
            
            // Sparkling decorative stars
            Image(systemName: "sparkle")
                .font(.system(size: 16))
                .foregroundColor(Theme.deepRose.opacity(0.7))
                .offset(x: 44, y: -40)
            
            Image(systemName: "sparkle")
                .font(.system(size: 12))
                .foregroundColor(Theme.lavenderAccent)
                .offset(x: -42, y: -20)
            
            Image(systemName: "heart.fill")
                .font(.system(size: 11))
                .foregroundColor(Theme.pastelRose)
                .offset(x: 38, y: 35)
        }
        .frame(height: 140)
    }
}

struct EmptyStateView: View {
    let title: String
    let subtitle: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    
    var body: some View {
        VStack(spacing: 16) {
            EmptyCakeStandIllustration()
                .padding(.bottom, 6)
            
            Text(title)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(Theme.textDark)
            
            Text(subtitle)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            if let actionTitle = actionTitle, let action = action {
                Button(action: {
                    HapticManager.shared.impact(style: .light)
                    action()
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "plus.circle.fill")
                        Text(actionTitle)
                    }
                    .font(.system(size: 14, weight: .semibold, design: .rounded))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(Theme.roseGoldGradient)
                    .clipShape(Capsule())
                    .shadow(color: Theme.roseGold.opacity(0.3), radius: 6, y: 3)
                }
                .buttonStyle(ScaleButtonStyle())
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 36)
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    EmptyStateView(
        title: "No Cake Orders Yet",
        subtitle: "When you receive custom cake orders, they will appear here with delivery timelines.",
        actionTitle: "Create First Order",
        action: {}
    )
    .padding()
    .background(Theme.cream)
}

