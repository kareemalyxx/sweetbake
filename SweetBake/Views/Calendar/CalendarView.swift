import SwiftUI

// MARK: - Premium Native iOS Calendar & Schedule View
public struct CalendarView: View {
    @Binding public var orders: [Order]
    @State private var selectedDate = Date()
    @State private var showingOrderEntry = false
    @State private var orderToEdit: Order? = nil
    
    public init(orders: Binding<[Order]>) {
        self._orders = orders
    }
    
    private var ordersForSelectedDate: [Order] {
        let calendar = Calendar.current
        return orders.filter { calendar.isDate($0.deliveryDate, inSameDayAs: selectedDate) }
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Graphical Native Calendar Card
                    VStack(alignment: .leading, spacing: 8) {
                        DatePicker(
                            "Delivery Date",
                            selection: $selectedDate,
                            displayedComponents: [.date]
                        )
                        .datePickerStyle(.graphical)
                        .tint(Theme.Colors.deepRose)
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
                    .padding(.horizontal, 16)
                    
                    // Selected Date Orders Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "calendar.day.timeline.left")
                                .symbolRenderingMode(.hierarchical)
                                .foregroundColor(Theme.Colors.deepRose)
                            
                            Text("Orders Due (\(selectedDate.formatted(.dateTime.weekday(.wide).month().day())))")
                                .font(.headline)
                                .foregroundColor(Theme.Colors.textDark)
                            
                            Spacer()
                            
                            Text("\(ordersForSelectedDate.count) scheduled")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(Theme.Colors.textSecondary)
                        }
                        .padding(.horizontal, 16)
                        
                        if ordersForSelectedDate.isEmpty {
                            EmptyStateView(
                                title: "No Cakes Due",
                                message: "Enjoy your baking prep day or tap + to book an order for this date.",
                                systemImage: "sparkles"
                            )
                            .padding(.top, 12)
                        } else {
                            VStack(spacing: 10) {
                                ForEach(ordersForSelectedDate) { order in
                                    OrderRowView(
                                        order: order,
                                        onQuickAdvance: { advanceStatus(for: order) },
                                        onDelete: { deleteOrder(order) }
                                    )
                                    .onTapGesture {
                                        orderToEdit = order
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                }
                .padding(.vertical, 12)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Bake Schedule")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        HapticManager.selection()
                        showingOrderEntry = true
                    } label: {
                        Label("Add", systemImage: "plus")
                            .symbolRenderingMode(.hierarchical)
                            .fontWeight(.semibold)
                    }
                    .tint(Theme.Colors.deepRose)
                }
            }
            .sheet(isPresented: $showingOrderEntry) {
                OrderEntryView(orders: $orders, initialDate: selectedDate)
            }
            .sheet(item: $orderToEdit) { order in
                OrderEntryView(orders: $orders, orderToEdit: order)
            }
        }
    }
    
    private func advanceStatus(for order: Order) {
        guard let index = orders.firstIndex(where: { $0.id == order.id }) else { return }
        HapticManager.medium()
        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
            orders[index].status = orders[index].status.next
        }
    }
    
    private func deleteOrder(_ order: Order) {
        HapticManager.light()
        withAnimation(.easeOut(duration: 0.25)) {
            orders.removeAll { $0.id == order.id }
        }
    }
}
