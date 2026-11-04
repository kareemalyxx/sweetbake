import SwiftUI

// MARK: - Premium Native iOS Dashboard View (HIG & Accessibility Compliant)
public struct DashboardView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
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
                    
                    // 4. Active Date Filter Banner
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
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                    }
                    .tint(Theme.Colors.deepRose)
                    .accessibilityLabel("Create New Cake Order")
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
    
    // MARK: - Status Filter Bar (Native Segmented Chips with 44pt Touch Targets)
    private var statusFilterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    title: "All",
                    count: orders.count,
                    isSelected: selectedFilter == nil
                ) {
                    HapticManager.selection()
                    applyFilterAnimation {
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
                        applyFilterAnimation {
                            selectedFilter = (selectedFilter == status) ? nil : status
                        }
                    }
                }
            }
            .padding(.vertical, 2)
        }
    }
    
    private func applyFilterAnimation(_ block: () -> Void) {
        if reduceMotion {
            block()
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                block()
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
                .font(.subheadline.weight(.medium))
                .foregroundColor(Theme.Colors.textDark)
            
            Spacer()
            
            // 44x44pt Touch Target for Clear Filter
            Button {
                HapticManager.light()
                applyFilterAnimation {
                    selectedDateFilter = nil
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .symbolRenderingMode(.hierarchical)
                    .foregroundColor(Color(UIColor.secondaryLabel))
                    .font(.body)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Clear date filter")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 6)
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
                    .contentShape(Rectangle())
                    .onTapGesture {
                        orderToEdit = order
                    }
                    .accessibilityHint("Double tap to view or edit order details")
                }
            }
        }
    }
    
    private func advanceStatus(for order: Order) {
        guard let index = orders.firstIndex(where: { $0.id == order.id }) else { return }
        HapticManager.medium()
        if reduceMotion {
            orders[index].status = orders[index].status.next
        } else {
            withAnimation(.easeInOut(duration: 0.25)) {
                orders[index].status = orders[index].status.next
            }
        }
    }
    
    private func deleteOrder(_ order: Order) {
        HapticManager.light()
        if reduceMotion {
            orders.removeAll { $0.id == order.id }
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                orders.removeAll { $0.id == order.id }
            }
        }
    }
}

// MARK: - Filter Chip Component (44pt Minimum Touch Target)
struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.subheadline.weight(isSelected ? .bold : .medium))
                
                Text("\(count)")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(
                        Capsule()
                            .fill(isSelected ? Color.white.opacity(0.3) : Theme.Colors.blushPink)
                    )
                    .foregroundColor(isSelected ? .white : Theme.Colors.deepRose)
            }
            .padding(.horizontal, 14)
            .frame(minHeight: 44)
            .background(
                Capsule()
                    .fill(isSelected ? Theme.Colors.deepRose : Theme.Colors.secondaryBackground)
            )
            .foregroundColor(isSelected ? .white : Theme.Colors.textDark)
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Theme.Colors.border, lineWidth: 1)
            )
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title) filter, \(count) orders")
        .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
    }
}
