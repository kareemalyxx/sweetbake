//
//  DashboardView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct DashboardView: View {
    @Environment(\.modelContext) private var modelContext
    
    // Fetch upcoming and past orders sorted ascending by deliveryDate
    @Query(sort: \Order.deliveryDate, order: .forward) private var allOrders: [Order]
    
    @State private var searchText: String = ""
    @State private var selectedStatusFilter: OrderStatus? = nil
    @State private var showingAddOrderSheet = false
    
    private var filteredOrders: [Order] {
        allOrders.filter { order in
            let matchesSearch: Bool
            if searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                matchesSearch = true
            } else {
                let term = searchText.lowercased()
                matchesSearch = order.customerName.lowercased().contains(term) ||
                                order.cakeType.lowercased().contains(term) ||
                                order.flavor.lowercased().contains(term) ||
                                order.shape.lowercased().contains(term)
            }
            
            let matchesStatus: Bool
            if let filter = selectedStatusFilter {
                matchesStatus = (order.status == filter)
            } else {
                matchesStatus = true
            }
            
            return matchesSearch && matchesStatus
        }
    }
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                List {
                    // Header Metrics Section
                    Section {
                        VStack(spacing: 14) {
                            NextSevenDaysWidget(orders: allOrders)
                            RevenueTrackerView(orders: allOrders)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    
                    // Quick Status Filter Pills
                    Section {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                FilterChip(
                                    title: "All Orders",
                                    isSelected: selectedStatusFilter == nil,
                                    count: allOrders.count
                                ) {
                                    HapticManager.shared.selection()
                                    selectedStatusFilter = nil
                                }
                                
                                ForEach(OrderStatus.allCases) { status in
                                    let count = allOrders.filter { $0.status == status }.count
                                    FilterChip(
                                        title: status.rawValue,
                                        isSelected: selectedStatusFilter == status,
                                        count: count
                                    ) {
                                        HapticManager.shared.selection()
                                        selectedStatusFilter = status
                                    }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 4)
                        }
                        .listRowInsets(EdgeInsets())
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                    
                    // Order Timeline Feed
                    Section {
                        if filteredOrders.isEmpty {
                            EmptyStateView(
                                title: allOrders.isEmpty ? "No Cake Orders Yet" : "No Matching Orders",
                                subtitle: allOrders.isEmpty
                                    ? "Tap the '+' button to log your first bespoke cake commission."
                                    : "Try refining your search filter or add a new custom order.",
                                actionTitle: allOrders.isEmpty ? "Create Cake Order" : nil,
                                action: allOrders.isEmpty ? { showingAddOrderSheet = true } : nil
                            )
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(filteredOrders) { order in
                                NavigationLink(destination: OrderDetailView(order: order)) {
                                    OrderRowView(order: order)
                                }
                                .listRowBackground(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .fill(Color.white)
                                        .padding(.vertical, 4)
                                        .shadow(color: Theme.textDark.opacity(0.04), radius: 6, y: 3)
                                )
                                .listRowSeparator(.hidden)
                                .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                                .swipeActions(edge: .leading, allowsFullSwipe: true) {
                                    // Quick advance status swipe action
                                    if let next = order.status.nextStatus {
                                        Button {
                                            advanceOrderStatus(order, to: next)
                                        } label: {
                                            Label("Mark \(next.rawValue)", systemImage: next.iconName)
                                        }
                                        .tint(colorForStatus(next))
                                    }
                                }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        deleteOrder(order)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                    
                                    // Step backwards in status if needed
                                    if order.status != .pending {
                                        Button {
                                            setOrderStatus(order, to: .pending)
                                        } label: {
                                            Label("Pending", systemImage: "arrow.uturn.backward")
                                        }
                                        .tint(Theme.pendingOrangeDark)
                                    }
                                }
                            }
                        }
                    } header: {
                        HStack {
                            Text("Scheduled Commissions (\(filteredOrders.count))")
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .foregroundColor(Theme.textMauve)
                            Spacer()
                        }
                        .padding(.top, 4)
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.cream.ignoresSafeArea())
                
                // Floating Action Button (FAB)
                Button(action: {
                    HapticManager.shared.impact(style: .medium)
                    showingAddOrderSheet = true
                }) {
                    ZStack {
                        Circle()
                            .fill(Theme.roseGoldGradient)
                            .frame(width: 60, height: 60)
                            .shadow(color: Theme.roseGold.opacity(0.45), radius: 10, x: 0, y: 5)
                        
                        Image(systemName: "plus")
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(ScaleButtonStyle(scaleAmount: 0.92))
                .padding(.trailing, 22)
                .padding(.bottom, 22)
            }
            .navigationTitle("SweetBake Studio")
            .navigationBarTitleDisplayMode(.large)
            .searchable(
                text: $searchText,
                placement: .navigationBarDrawer(displayMode: .automatic),
                prompt: "Search customer, flavor, cake type..."
            )
            .sheet(isPresented: $showingAddOrderSheet) {
                OrderEntryView()
            }
        }
    }
    
    private func advanceOrderStatus(_ order: Order, to next: OrderStatus) {
        HapticManager.shared.impact(style: .medium)
        withAnimation {
            order.status = next
            try? modelContext.save()
        }
    }
    
    private func setOrderStatus(_ order: Order, to status: OrderStatus) {
        HapticManager.shared.impact(style: .light)
        withAnimation {
            order.status = status
            try? modelContext.save()
        }
    }
    
    private func deleteOrder(_ order: Order) {
        HapticManager.shared.notification(type: .warning)
        withAnimation {
            modelContext.delete(order)
            try? modelContext.save()
        }
    }
    
    private func colorForStatus(_ status: OrderStatus) -> Color {
        switch status {
        case .pending: return Theme.pendingOrangeDark
        case .baking: return Theme.bakingBlueDark
        case .decorating: return Theme.decoratingPurpleDark
        case .delivered: return Theme.deliveredGreenDark
        }
    }
}

private struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Text(title)
                    .font(.system(size: 13, weight: isSelected ? .bold : .medium, design: .rounded))
                Text("(\(count))")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .opacity(0.8)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(isSelected ? Theme.deepRose : Color.white)
            .foregroundColor(isSelected ? .white : Theme.textDark)
            .clipShape(Capsule())
            .shadow(color: Theme.textDark.opacity(isSelected ? 0.15 : 0.04), radius: 4, y: 2)
            .overlay(
                Capsule()
                    .stroke(isSelected ? Theme.deepRose : Theme.pastelRose.opacity(0.4), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle(scaleAmount: 0.95))
    }
}

#Preview {
    DashboardView()
        .modelContainer(for: Order.self, inMemory: true)
}

