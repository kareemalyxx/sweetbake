import SwiftUI

// MARK: - Premium Native iOS Dashboard View
public struct DashboardView: View {
    @Binding public var orders: [Order]
    @State private var selectedFilter: OrderStatus? = nil
    @State private var showingOrderEntry = false
    @State private var orderToEdit: Order? = nil
    @State private var selectedDateFilter: Date? = nil
    @State private var searchText = ""
    
    public init(orders: Binding<[Order]>) {
        self._orders = orders
    }
    
    private var filteredOrders: [Order] {
        orders.filter { order in
            let matchesStatus = selectedFilter == nil || order.status == selectedFilter
            let matchesSearch = searchText.isEmpty ||
                order.customerName.localizedCaseInsensitiveContains(searchText) ||
                order.cakeType.localizedCaseInsensitiveContains(searchText) ||
                order.flavor.localizedCaseInsensitiveContains(searchText)
            
            let matchesDate: Bool
            if let filterDate = selectedDateFilter {
                matchesDate = Calendar.current.isDate(order.deliveryDate, inSameDayAs: filterDate)
            } else {
                matchesDate = true
            }
            
            return matchesStatus && matchesSearch && matchesDate
        }
    }
    
    public var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    // 1. Next 7 Days Rush interactive timeline widget
                    NextSevenDaysWidget(
                        orders: orders,
                        selectedDateFilter: $selectedDateFilter
                    )
                    .padding(.horizontal, 16)
                    
                    // 2. Revenue Tracker (Pipeline vs Delivered)
                    RevenueTrackerView(orders: orders)
                        .padding(.horizontal, 16)
                    
                    // 3. Status Filters Bar
                    statusFilterBar
                        .padding(.horizontal, 16)
                    
                    // 4. Active Date Filter Pill
                    if let activeDate = selectedDateFilter {
                        activeDateBanner(for: activeDate)
                            .padding(.horizontal, 16)
                    }
                    
                    // 5. Orders Feed Section
                    ordersFeedSection
                        .padding(.horizontal, 16)
                }
                .padding(.vertical, 12)
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("SweetBake Studio")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $searchText, prompt: "Search orders, flavors, clients...")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        HapticManager.selection()
                        showingOrderEntry = true
                    } label: {
                        Label("New Order", systemImage: "plus")
                            .symbolRenderingMode(.hierarchical)
                            .fontWeight(.semibold)
                    }
                    .tint(Theme.Colors.deepRose)
                }
            }
            .sheet(isPresented: $showingOrderEntry) {
                OrderEntryView(orders: $orders)
            }
            .sheet(item: $orderToEdit) { order in
                OrderEntryView(orders: $orders, orderToEdit: order)
            }
        }
    }
    
    // MARK: - Status Filter Bar (Native Segmented Chips)
    private var statusFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    title: "All",
                    count: orders.count,
                    isSelected: selectedFilter == nil
                ) {
                    HapticManager.selection()
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                        selectedFilter = nil
                    }
                }
                
                ForEach(OrderStatus.allCases, id: \.self) { status in
                    let count = orders.filter { $0.status == status }.count
                    FilterChip(
                        title: status.rawValue,
                        count: count,
                        isSelected: selectedFilter == status
                    ) {
                        HapticManager.selection()
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.75)) {
                            selectedFilter = (selectedFilter == status) ? nil : status
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Active Date Banner
    private func activeDateBanner(for date: Date) -> some View {
        HStack {
            Image(systemName: "calendar.badge.clock")
                .symbolRenderingMode(.multicolor)
                .font(.subheadline)
            
            Text("Filtering for \(date.formatted(.dateTime.weekday(.wide).month().day()))")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundColor(Theme.Colors.textDark)
            
            Spacer()
            
            Button {
                HapticManager.light()
                withAnimation {
                    selectedDateFilter = nil
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundColor(Theme.Colors.textSecondary)
                    .font(.body)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(Theme.Colors.lavenderLight)
        )
    }
    
    // MARK: - Orders Feed Section
    @ViewBuilder
    private var ordersFeedSection: some View {
        if filteredOrders.isEmpty {
            EmptyStateView(
                title: "No Cake Orders Found",
                message: selectedFilter != nil || selectedDateFilter != nil || !searchText.isEmpty
                    ? "Try adjusting your search terms or filters."
                    : "Tap the + button above to schedule your first custom cake commission!",
                systemImage: "birthday.cake"
            )
            .padding(.top, 24)
        } else {
            VStack(spacing: 12) {
                ForEach(filteredOrders) { order in
                    OrderRowView(
                        order: order,
                        onQuickAdvance: {
                            advanceStatus(for: order)
                        },
                        onDelete: {
                            deleteOrder(order)
                        }
                    )
                    .onTapGesture {
                        orderToEdit = order
                    }
                }
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

// MARK: - Filter Chip Component
struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .bold : .medium)
                
                Text("\(count)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(isSelected ? Color.white.opacity(0.3) : Theme.Colors.blushPink)
                    )
                    .foregroundColor(isSelected ? .white : Theme.Colors.deepRose)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(
                Capsule()
                    .fill(isSelected ? Theme.Colors.deepRose : Theme.Colors.secondaryBackground)
            )
            .foregroundColor(isSelected ? .white : Theme.Colors.textDark)
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Theme.Colors.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
