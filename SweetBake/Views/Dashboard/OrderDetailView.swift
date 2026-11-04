//
//  OrderDetailView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct OrderDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    @Bindable var order: Order
    @State private var showingEditSheet = false
    @State private var showingDeleteAlert = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Hero Card
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        StatusPillView(status: order.status)
                        Spacer()
                        Text(order.quotedPrice, format: .currency(code: "USD"))
                            .font(.title2.weight(.bold))
                            .foregroundColor(Theme.textMauve)
                    }
                    
                    Text(order.customerName)
                        .font(.title.weight(.bold))
                        .foregroundColor(Theme.textDark)
                    
                    HStack(spacing: 8) {
                        Image(systemName: "calendar.badge.clock")
                            .symbolRenderingMode(.hierarchical)
                            .foregroundColor(Theme.deepRose)
                            .font(.subheadline)
                        Text(order.deliveryDate.formatted(date: .complete, time: .shortened))
                            .font(.subheadline.weight(.medium))
                            .foregroundColor(Color(UIColor.secondaryLabel))
                    }
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(UIColor.secondarySystemGroupedBackground))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Theme.pastelRose.opacity(0.35), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.04), radius: 6, y: 3)
                
                // Status Advancement Control
                VStack(alignment: .leading, spacing: 12) {
                    Text("Change Status")
                        .font(.subheadline.weight(.bold))
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
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(UIColor.secondarySystemGroupedBackground))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Theme.pastelRose.opacity(0.35), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.04), radius: 6, y: 3)
                
                // Cake Attributes
                VStack(alignment: .leading, spacing: 14) {
                    Text("Cake Specifications")
                        .font(.headline.weight(.bold))
                        .foregroundColor(Theme.textDark)
                    
                    Divider()
                    
                    DetailRow(title: "Cake Type", value: order.cakeType, icon: "birthday.cake")
                    DetailRow(title: "Shape", value: order.shape, icon: "square.on.circle")
                    DetailRow(title: "Flavor & Filling", value: order.flavor, icon: "heart.circle")
                }
                .padding(16)
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(Color(UIColor.secondarySystemGroupedBackground))
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(Theme.pastelRose.opacity(0.35), lineWidth: 1)
                )
                .shadow(color: Color.black.opacity(0.04), radius: 6, y: 3)
                
                // Custom Requirements
                if !order.customRequirements.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 8) {
                            Image(systemName: "note.text")
                                .symbolRenderingMode(.hierarchical)
                                .foregroundColor(Theme.deepRose)
                                .font(.headline)
                            Text("Custom Requirements & Notes")
                                .font(.headline.weight(.bold))
                                .foregroundColor(Theme.textDark)
                        }
                        
                        Text(order.customRequirements)
                            .font(.subheadline)
                            .foregroundColor(Theme.textDark)
                            .lineSpacing(4)
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color(UIColor.secondarySystemGroupedBackground))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Theme.pastelRose.opacity(0.35), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.04), radius: 6, y: 3)
                }
                
                // Reference Photos
                if !order.referenceImages.isEmpty {
                    VStack(alignment: .leading, spacing: 14) {
                        HStack {
                            Image(systemName: "photo.on.rectangle.angled")
                                .symbolRenderingMode(.hierarchical)
                                .foregroundColor(Theme.deepRose)
                                .font(.headline)
                            Text("Reference Photos & Sketches")
                                .font(.headline.weight(.bold))
                                .foregroundColor(Theme.textDark)
                            Spacer()
                            Text("\(order.referenceImages.count) attached")
                                .font(.caption)
                                .foregroundColor(Color(UIColor.secondaryLabel))
                        }
                        
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(Array(order.referenceImages.enumerated()), id: \.offset) { _, data in
                                    if let uiImage = UIImage(data: data) {
                                        Image(uiImage: uiImage)
                                            .resizable()
                                            .scaledToFill()
                                            .frame(width: 140, height: 140)
                                            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                            .overlay(
                                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                                    .stroke(Theme.pastelRose.opacity(0.5), lineWidth: 1)
                                            )
                                    }
                                }
                            }
                        }
                    }
                    .padding(16)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(Color(UIColor.secondarySystemGroupedBackground))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(Theme.pastelRose.opacity(0.35), lineWidth: 1)
                    )
                    .shadow(color: Color.black.opacity(0.04), radius: 6, y: 3)
                }
            }
            .padding(16)
        }
        .background(Color(UIColor.systemGroupedBackground).ignoresSafeArea())
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
                        .font(.title3)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Order options")
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
                .symbolRenderingMode(.hierarchical)
                .font(.footnote)
                .foregroundColor(Theme.softLilac)
                .frame(width: 24)
                .accessibilityHidden(true)
            
            Text(title)
                .font(.subheadline)
                .foregroundColor(Color(UIColor.secondaryLabel))
            
            Spacer()
            
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundColor(Theme.textDark)
        }
        .padding(.vertical, 3)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(title): \(value)")
    }
}

