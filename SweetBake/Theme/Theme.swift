import SwiftUI

// MARK: - Premium Native iOS Dynamic Pastel Theme
public struct Theme {
    public struct Colors {
        // Soft feminine pastel tones
        public static let blushPink = Color(hex: "FAE4E8")
        public static let pastelRose = Color(hex: "F4B8C4")
        public static let deepRose = Color(hex: "DB7093")
        public static let roseGold = Color(hex: "B76E79")
        
        // Dynamic Adaptive Backgrounds (Seamless Light & Dark Mode)
        public static let background = Color(UIColor.systemGroupedBackground)
        public static let secondaryBackground = Color(UIColor.secondarySystemGroupedBackground)
        public static let tertiaryBackground = Color(UIColor.tertiarySystemGroupedBackground)
        public static let cardBackground = Color(UIColor.secondarySystemGroupedBackground)
        
        // Cream & Warm Ivory tinted for Light mode, subtle charcoal for Dark mode
        public static let cream = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex: "18151A") : UIColor(hex: "FEFBF6")
        })
        public static let warmIvory = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex: "231D26") : UIColor(hex: "F7F3EC")
        })
        public static let card = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex: "241F28") : UIColor.white
        })
        
        // Lavender Accents
        public static let lavenderLight = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex: "2B2036") : UIColor(hex: "F0EBF8")
        })
        public static let lavenderAccent = Color(hex: "C2B2E4")
        public static let softLilac = Color(hex: "A58CC3")
        
        // Status Colors (Dynamic Light/Dark)
        public struct Status {
            public static let pending = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "3F2B14") : UIColor(hex: "FAD6A5")
            })
            public static let pendingDark = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "FDBA74") : UIColor(hex: "C86A1A")
            })
            public static let baking = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "1A3347") : UIColor(hex: "C5E1F5")
            })
            public static let bakingDark = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "7DD3FC") : UIColor(hex: "2B72A3")
            })
            public static let decorating = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "351B4D") : UIColor(hex: "E4CDF5")
            })
            public static let decoratingDark = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "D8B4FE") : UIColor(hex: "7C3AED")
            })
            public static let delivered = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "133821") : UIColor(hex: "C8ECD6")
            })
            public static let deliveredDark = Color(UIColor { trait in
                trait.userInterfaceStyle == .dark ? UIColor(hex: "4ADE80") : UIColor(hex: "1E7E34")
            })
        }
        
        // Dynamic Typography & Borders
        public static let textDark = Color(UIColor.label)
        public static let textMauve = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(hex: "D7C4D5") : UIColor(hex: "5A4858")
        })
        public static let textSecondary = Color(UIColor.secondaryLabel)
        public static let tertiaryText = Color(UIColor.tertiaryLabel)
        
        public static let border = Color(UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor.white.withAlphaComponent(0.12) : UIColor(hex: "F4B8C4").withAlphaComponent(0.35)
        })
        public static let separator = Color(UIColor.separator)
    }
    
    public struct CornerRadius {
        public static let card: CGFloat = 16
        public static let button: CGFloat = 14
        public static let pill: CGFloat = 12
        public static let input: CGFloat = 12
    }
}

// MARK: - Color Hex Initializer
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}
