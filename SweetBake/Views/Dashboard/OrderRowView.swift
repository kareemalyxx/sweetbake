import SwiftUI

// MARK: - Premium Native iOS Order Row View (HIG & Accessibility Compliant)
public struct OrderRowView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public let order: Order
    public let onQuickAdvance: () -> Void
    public let onDelete: () -> Void
    
    public init(
        order: Order,
        onQuickAdvance: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.order = order
        self.onQuickAdvance = onQuickAdvance
        self.onDelete = onDelete
    }
    
    public var body: some View {
        HStack(spacing: 14) {
            // Cake Inspiration Thumb / Symbol
            previewThumbnail
                .accessibilityHidden(true)
            
            // Order Core Details
            VStack(alignment: .leading, spacing: 4) {
                // Top line: Client Name & Quoted Price
                HStack(alignment: .firstTextBaseline) {
                    Text(order.customerName)
                        .font(.headline)
                        .foregroundColor(Theme.Colors.textDark)
                        .lineLimit(1)
                    
                    Spacer()
                    
                    Text("$\(order.quotedPrice, specifier: "%.2f")")
                        .font(.subheadline.weight(.bold))
                        .foregroundColor(Theme.Colors.deepRose)
                }
                
                // Subtitle: Cake Type & Shape
                Text("\(order.cakeType) • \(order.shape)")
                    .font(.subheadline)
                    .foregroundColor(Color(UIColor.secondaryLabel))
                    .lineLimit(1)
                
                // Due Date & Time
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .symbolRenderingMode(.hierarchical)
                        .font(.caption2)
                        .foregroundColor(Color(UIColor.tertiaryLabel))
                    
                    Text(order.deliveryDate.formatted(.dateTime.weekday(.short).month(.abbreviated).day().hour().minute()))
                        .font(.caption)
                        .foregroundColor(Color(UIColor.secondaryLabel))
                }
                .padding(.top, 1)
                
                // Badges & Pills Row
                HStack(spacing: 6) {
                    StatusPillView(status: order.status)
                    
                    if !order.flavor.isEmpty {
                        Text(order.flavor)
                            .font(.caption2.weight(.medium))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Theme.Colors.warmIvory)
                            .foregroundColor(Theme.Colors.textDark)
                            .clipShape(Capsule())
                            .lineLimit(1)
                    }
                    
                    if !order.addons.isEmpty {
                        HStack(spacing: 3) {
                            Image(systemName: "sparkles")
                                .symbolRenderingMode(.multicolor)
                                .font(.caption2)
                            Text("+\(order.addons.count)")
                                .font(.caption2.weight(.bold))
                        }
                        .padding(.horizontal, 6)
                        .padding(.vertical, 3)
                        .background(Theme.Colors.blushPink)
                        .foregroundColor(Theme.Colors.deepRose)
                        .clipShape(Capsule())
                    }
                    
                    Spacer(minLength: 0)
                }
                .padding(.top, 4)
            }
            
            // Quick Advance Action Button (Guaranteed 44x44pt Touch Target)
            if order.status != .delivered {
                Button(action: onQuickAdvance) {
                    VStack(spacing: 3) {
                        Image(systemName: "chevron.right.circle.fill")
                            .symbolRenderingMode(.hierarchical)
                            .font(.title3)
                            .foregroundColor(Theme.Colors.deepRose)
                        
                        Text(order.status.next.actionTitle)
                            .font(.caption2.weight(.bold))
                            .foregroundColor(Theme.Colors.deepRose)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Advance status to \(order.status.next.rawValue)")
                .accessibilityHint("Double tap to progress this order")
            }
        }
        .padding(14)
        // High-frequency list row: opaque semantic card (never glass/translucent materials)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Theme.Colors.secondaryBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Theme.Colors.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
        .contextMenu {
            Button(role: .destructive, action: onDelete) {
                Label("Delete Order", systemImage: "trash")
            }
        }
    }
    
    // MARK: - Preview Thumbnail
    private var previewThumbnail: some View {
        Group {
            if let firstData = order.referenceImagesData.first,
               let uiImage = UIImage(data: firstData) {
                Image(uiImage: uiImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 58, height: 58)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(Theme.Colors.lavenderLight)
                        .frame(width: 58, height: 58)
                    
                    Image(systemName: "birthday.cake.fill")
                        .symbolRenderingMode(.hierarchical)
                        .font(.title2)
                        .foregroundColor(Theme.Colors.softLilac)
                }
            }
        }
    }
}
