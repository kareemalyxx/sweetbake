//
//  OrderDetailView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct OrderDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    
    @Bindable var order: Order
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Hero
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        StatusPillView(status: order.status)
                        Spacer()
                        Text(order.quotedPrice, format: .currency(code: "USD"))
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundColor(Theme.textMauve)
                    }
                    
                    Text(order.customerName)
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.textDark)
                    
                    HStack(spacing: 8) {
                        Image(systemName: "calendar.badge.clock")
                            .foregroundColor(Theme.deepRose)
                        Text(order.deliveryDate.formatted(date: .complete, time: .shortened))
                            .font(.system(size: 15, weight: .medium, design: .rounded))
                            .foregroundColor(Theme.textDark)
                    }
                }
                .sweetCardStyle()
                
                // Status Advancement Control
                VStack(alignment: .leading, spacing: 10) {
                    Text("Change Status")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                    
                    Picker("Status", selection: $order.status) {
                        ForEach(OrderStatus.allCases) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: order.status) { _, _ in
                        HapticManager.shared.impact(style: .medium)
                        try? modelContext.save()
                    }
                }
                .sweetCardStyle()
                
                // Cake Attributes
                VStack(alignment: .leading, spacing: 12) {
                    Text("Cake Specifications")
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                        .foregroundColor(Theme.textDark)
                    
                    Divider()
                    
                    DetailRow(title: "Cake Type", value: order.cakeType, icon: "birthday.cake")
                    DetailRow(title: "Shape", value: order.shape, icon: "square.on.circle")
                    DetailRow(title: "Flavor & Filling", value: order.flavor, icon: "heart.circle")
                }
                .sweetCardStyle()
                
                // Custom Requirements
                if !order.customRequirements.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 6) {
                            Image(systemName: "note.text")
                                .foregroundColor(Theme.deepRose)
                            Text("Custom Requirements & Notes")
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundColor(Theme.textDark)
                        }
                        
                        Text(order.customRequirements)
                            .font(.system(size: 14, design: .rounded))
                            .foregroundColor(Theme.textDark)
                            .lineSpacing(4)
                    }
                    .sweetCardStyle()
                }
                
                // Reference Photos
                if !order.referenceImages.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Image(systemName: "photo.on.rectangle.angled")
                                .foregroundColor(Theme.deepRose)
                            Text("Reference Photos & Sketches")
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundColor(Theme.textDark)
                            Spacer()
                            Text("\(order.referenceImages.count) attached")
                                .font(.caption)
                                .foregroundColor(Theme.textSecondary)
                        }
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(Array(order.referenceImages.enumerated()), id: \.offset) { _, data in
                                    if let uiImage = UIImage(data: data) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 140, height: 140)
                                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                                    .stroke(Theme.pastelRose, lineWidth: 1)
                                            )
                                    }
                                }
                            }
                        }
                    }
                    .sweetCardStyle()
                }
            }
            .padding(16)
        }
        .background(Theme.cream.ignoresSafeArea())
        .navigationTitle("Order Details")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button(action: {
                        showingEditSheet = true
                    }) {
                        Label("Edit Order", systemImage: "pencil")
                    }
                    
                    Button(role: .destructive, action: {
                        showingDeleteAlert = true
                    }) {
                        Label("Delete Order", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundColor(Theme.roseGold)
                        .font(.system(size: 18))
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            OrderEntryView(orderToEdit: order)
        }
        .alert("Delete this cake order?", isPresented: $showingDeleteAlert) {
            Button("Delete", role: .destructive) {
                HapticManager.shared.notification(type: .warning)
                modelContext.delete(order)
                try? modelContext.save()
                dismiss()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This action cannot be undone.")
        }
    }
}

private struct DetailRow: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(Theme.softLilac)
                .frame(width: 22)
            
            Text(title)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(Theme.textSecondary)
            
            Spacer()
            
            Text(value)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundColor(Theme.textDark)
        }
        .padding(.vertical, 2)
    }
}

