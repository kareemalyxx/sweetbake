import SwiftUI

// MARK: - Premium Native iOS Next 7 Days Rush Widget (HIG & Accessibility Compliant)
public struct NextSevenDaysWidget: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public let orders: [Order]
    @Binding public var selectedDateFilter: Date?
    
    public init(orders: [Order], selectedDateFilter: Binding<Date?>) {
        self.orders = orders
        self._selectedDateFilter = selectedDateFilter
    }
    
    private var nextSevenDays: [Date] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        return (0..<7).compactMap { dayOffset in
            calendar.date(byAdding: .day, value: dayOffset, to: today)
        }
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Widget Title & Subtitle
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .symbolRenderingMode(.multicolor)
                        .font(.subheadline)
                    Text("Next 7 Days Rush")
                        .font(.headline)
                        .foregroundColor(Theme.Colors.textDark)
                }
                
                Spacer()
                
                Text("Tap day to filter")
                    .font(.caption2.weight(.medium))
                    .foregroundColor(Color(UIColor.secondaryLabel))
            }
            
            // 7 Days Timeline Horizontal Carousel
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(nextSevenDays, id: \.self) { date in
                        let isSelected = selectedDateFilter != nil &&
                            Calendar.current.isDate(selectedDateFilter!, inSameDayAs: date)
                        let count = countForDate(date)
                        
                        DayTimelineCard(
                            date: date,
                            orderCount: count,
                            isSelected: isSelected
                        ) {
                            HapticManager.selection()
                            // Respect Accessibility Reduce Motion
                            if reduceMotion {
                                toggleDateFilter(date: date, isSelected: isSelected)
                            } else {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    toggleDateFilter(date: date, isSelected: isSelected)
                                }
                            }
                        }
                    }
                }
                .padding(.vertical, 2)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Theme.Colors.secondaryBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Theme.Colors.border, lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
    }
    
    private func toggleDateFilter(date: Date, isSelected: Bool) {
        if isSelected {
            selectedDateFilter = nil
        } else {
            selectedDateFilter = date
        }
    }
    
    private func countForDate(_ date: Date) -> Int {
        let calendar = Calendar.current
        return orders.filter { calendar.isDate($0.deliveryDate, inSameDayAs: date) }.count
    }
}

// MARK: - Day Timeline Card Component
struct DayTimelineCard: View {
    let date: Date
    let orderCount: Int
    let isSelected: Bool
    let action: () -> Void
    
    private var isToday: Bool {
        Calendar.current.isDateInToday(date)
    }
    
    private var dateAccessibilityLabel: String {
        let dayString = isToday ? "Today" : date.formatted(.dateTime.weekday(.wide))
        let dateNumber = date.formatted(.dateTime.month(.wide).day())
        let countString = orderCount == 1 ? "1 cake order" : "\(orderCount) cake orders"
        return "\(dayString), \(dateNumber). \(countString)."
    }
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 6) {
                // Day of Week
                Text(isToday ? "Today" : date.formatted(.dateTime.weekday(.short)))
                    .font(.caption2.weight(isSelected || isToday ? .bold : .medium))
                    .foregroundColor(isSelected ? .white : (isToday ? Theme.Colors.deepRose : Color(UIColor.secondaryLabel)))
                
                // Day of Month Number
                Text(date.formatted(.dateTime.day()))
                    .font(.title3.weight(.bold))
                    .foregroundColor(isSelected ? .white : Theme.Colors.textDark)
                
                // Order count pill
                Text("\(orderCount)")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(isSelected ? Color.white.opacity(0.3) : (orderCount > 0 ? Theme.Colors.blushPink : Theme.Colors.warmIvory))
                    )
                    .foregroundColor(isSelected ? .white : (orderCount > 0 ? Theme.Colors.deepRose : Color(UIColor.secondaryLabel)))
            }
            // 58x86pt comfortably exceeds Apple's 44x44pt touch target rule
            .frame(width: 58, height: 86)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(isSelected ? Theme.Colors.deepRose : Theme.Colors.warmIvory)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isSelected ? Color.clear : (isToday ? Theme.Colors.deepRose.opacity(0.6) : Color.clear), lineWidth: 1.5)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(dateAccessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
        .accessibilityHint(isSelected ? "Double tap to clear date filter" : "Double tap to filter orders for this day")
    }
}
