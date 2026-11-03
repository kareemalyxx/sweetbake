//
//  CalendarView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct CalendarBakeView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Order.deliveryDate, order: .forward) private var allOrders: [Order]
    
    @State private var selectedDate: Date = Date()
    @State private var currentMonthAnchor: Date = Date()
    @State private var selectedOrderForDetail: Order? = nil
    @State private var showingAddOrderSheet: Bool = false
    
    private let calendar = Calendar.current
    private let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    
    // Orders for the currently selected date
    private var ordersForSelectedDate: [Order] {
        allOrders.filter { calendar.isDate($0.deliveryDate, inSameDayAs: selectedDate) }
    }
    
    // Days in current month anchor
    private var monthDates: [Date?] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: currentMonthAnchor),
              let firstDay = calendar.date(from: calendar.dateComponents([.year, .month], from: monthInterval.start)) else {
            return []
        }
        
        let firstWeekday = calendar.component(.weekday, from: firstDay) - 1 // 0 for Sunday
        let numberOfDays = calendar.range(of: .day, in: .month, for: firstDay)?.count ?? 30
        
        var dates: [Date?] = Array(repeating: nil, count: firstWeekday)
        
        for day in 0..<numberOfDays {
            if let date = calendar.date(byAdding: .day, value: day, to: firstDay) {
                dates.append(date)
            }
        }
        
        return dates
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Month Navigation & Calendar Card
                    VStack(spacing: 16) {
                        // Month Header
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(currentMonthAnchor.formatted(.dateTime.month(.wide).year()))
                                    .font(.system(size: 20, weight: .bold, design: .rounded))
                                    .foregroundColor(Theme.textDark)
                                
                                Text("\(allOrdersForMonth.count) orders booked this month")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundColor(Theme.textSecondary)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 8) {
                                Button(action: previousMonth) {
                                    Image(systemName: "chevron.left")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Theme.deepRose)
                                        .padding(8)
                                        .background(Theme.blushPink)
                                        .clipShape(Circle())
                                }
                                .buttonStyle(ScaleButtonStyle())
                                
                                Button(action: nextMonth) {
                                    Image(systemName: "chevron.right")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Theme.deepRose)
                                        .padding(8)
                                        .background(Theme.blushPink)
                                        .clipShape(Circle())
                                }
                                .buttonStyle(ScaleButtonStyle())
                            }
                        }
                        
                        // Weekday labels
                        HStack {
                            ForEach(daysOfWeek, id: \.self) { day in
                                Text(day)
                                    .font(.system(size: 11, weight: .bold, design: .rounded))
                                    .foregroundColor(Theme.textSecondary)
                                    .frame(maxWidth: .infinity)
                            }
                        }
                        
                        // Calendar Grid
                        let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)
                        LazyVGrid(columns: columns, spacing: 8) {
                            ForEach(Array(monthDates.enumerated()), id: \.offset) { index, date in
                                if let date = date {
                                    let ordersOnDate = ordersOn(date)
                                    let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
                                    let isToday = calendar.isDateInToday(date)
                                    
                                    Button(action: {
                                        HapticManager.shared.selection()
                                        selectedDate = date
                                    }) {
                                        VStack(spacing: 4) {
                                            Text("\(calendar.component(.day, from: date))")
                                                .font(.system(size: 14, weight: isSelected || isToday ? .bold : .regular, design: .rounded))
                                                .foregroundColor(
                                                    isSelected ? .white :
                                                    (isToday ? Theme.deepRose : Theme.textDark)
                                                )
                                            
                                            // Order indicator dots
                                            HStack(spacing: 3) {
                                                if ordersOnDate.isEmpty {
                                                    Circle().fill(Color.clear).frame(width: 4, height: 4)
                                                } else {
                                                    ForEach(Array(ordersOnDate.prefix(3))) { order in
                                                        Circle()
                                                            .fill(dotColor(for: order.status, isSelected: isSelected))
                                                            .frame(width: 5, height: 5)
                                                    }
                                                }
                                            }
                                            .frame(height: 6)
                                        }
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 44)
                                        .background(
                                            isSelected ? Theme.deepRose :
                                            (isToday ? Theme.blushPink : Color.white.opacity(0.7))
                                        )
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .stroke(isToday && !isSelected ? Theme.pastelRose : Color.clear, lineWidth: 1.5)
                                        )
                                    }
                                    .buttonStyle(ScaleButtonStyle(scaleAmount: 0.94))
                                } else {
                                    Color.clear
                                        .frame(height: 44)
                                }
                            }
                        }
                    }
                    .sweetCardStyle()
                    .padding(.horizontal, 16)
                    
                    // Selected Date Orders Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(selectedDate.formatted(date: .complete, time: .omitted))
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                                    .foregroundColor(Theme.textDark)
                                
                                Text("\(ordersForSelectedDate.count) cakes due on this day")
                                    .font(.system(size: 12, weight: .medium, design: .rounded))
                                    .foregroundColor(Theme.textSecondary)
                            }
                            
                            Spacer()
                            
                            Button(action: {
                                HapticManager.shared.impact(style: .light)
                                showingAddOrderSheet = true
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "plus")
                                    Text("Add Bake")
                                }
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundColor(Theme.deepRose)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 6)
                                .background(Theme.blushPink)
                                .clipShape(Capsule())
                            }
                            .buttonStyle(ScaleButtonStyle())
                        }
                        
                        if ordersForSelectedDate.isEmpty {
                            VStack(spacing: 8) {
                                Image(systemName: "sparkles")
                                    .font(.system(size: 28))
                                    .foregroundColor(Theme.softLilac)
                                Text("No bakes scheduled for this day")
                                    .font(.system(size: 14, weight: .medium, design: .rounded))
                                    .foregroundColor(Theme.textSecondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 28)
                            .background(Color.white.opacity(0.6))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                        } else {
                            VStack(spacing: 10) {
                                ForEach(ordersForSelectedDate) { order in
                                    NavigationLink(destination: OrderDetailView(order: order)) {
                                        OrderRowView(order: order)
                                            .padding(12)
                                            .background(Color.white)
                                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                            .shadow(color: Theme.textDark.opacity(0.04), radius: 6, y: 3)
                                    }
                                    .buttonStyle(ScaleButtonStyle(scaleAmount: 0.98))
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                }
                .padding(.top, 8)
            }
            .background(Theme.cream.ignoresSafeArea())
            .navigationTitle("Baking Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .sheet(isPresented: $showingAddOrderSheet) {
                OrderEntryView()
            }
        }
    }
    
    private var allOrdersForMonth: [Order] {
        allOrders.filter { calendar.isDate($0.deliveryDate, equalTo: currentMonthAnchor, toGranularity: .month) }
    }
    
    private func ordersOn(_ date: Date) -> [Order] {
        allOrders.filter { calendar.isDate($0.deliveryDate, inSameDayAs: date) }
    }
    
    private func previousMonth() {
        HapticManager.shared.selection()
        if let newDate = calendar.date(byAdding: .month, value: -1, to: currentMonthAnchor) {
            currentMonthAnchor = newDate
        }
    }
    
    private func nextMonth() {
        HapticManager.shared.selection()
        if let newDate = calendar.date(byAdding: .month, value: 1, to: currentMonthAnchor) {
            currentMonthAnchor = newDate
        }
    }
    
    private func dotColor(for status: OrderStatus, isSelected: Bool) -> Color {
        if isSelected {
            return .white
        }
        switch status {
        case .pending: return Theme.pendingOrangeDark
        case .baking: return Theme.bakingBlueDark
        case .decorating: return Theme.decoratingPurpleDark
        case .delivered: return Theme.deliveredGreenDark
        }
    }
}

#Preview {
    CalendarBakeView()
        .modelContainer(for: Order.self, inMemory: true)
}

