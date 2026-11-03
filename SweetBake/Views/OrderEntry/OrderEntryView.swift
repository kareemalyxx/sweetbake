//
//  OrderEntryView.swift
//  SweetBake
//

import SwiftUI
import SwiftData
import PhotosUI

struct OrderEntryView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    
    // Order editing state if modifying existing, or nil for new
    var orderToEdit: Order?
    
    // Form fields
    @State private var customerName: String = ""
    @State private var deliveryDate: Date = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
    @State private var cakeType: String = "Celebration Cake"
    @State private var shape: String = "Round"
    @State private var flavor: String = "Vanilla Bean & Berry"
    @State private var customRequirements: String = ""
    @State private var status: OrderStatus = .pending
    @State private var quotedPrice: Double = 85.0
    
    // Photo attachments
    @State private var selectedPhotoItems: [PhotosPickerItem] = []
    @State private var referenceImages: [Data] = []
    @State private var isProcessingPhotos: Bool = false
    
    private let cakeTypes = [
        "Celebration Cake", "Tiered Wedding Cake", "Bento Box Cake",
        "Vintage Heart Cake", "Cupcake Platter", "Number/Letter Cake"
    ]
    
    private let shapes = [
        "Round", "Heart", "Square", "Hexagon", "Multi-tiered", "Sheet"
    ]
    
    private let flavors = [
        "Vanilla Bean & Berry",
        "Rich Belgian Chocolate",
        "Red Velvet & Cream Cheese",
        "Lemon Lavender Curd",
        "Caramel Dulce de Leche",
        "Pistachio Rosewater",
        "Spiced Carrot Cake"
    ]
    
    var body: some View {
        NavigationStack {
            Form {
                // Section 1: Customer & Schedule
                Section {
                    HStack {
                        Image(systemName: "person.crop.circle.fill")
                            .foregroundColor(Theme.roseGold)
                        TextField("Customer Full Name", text: $customerName)
                            .textContentType(.name)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Delivery / Pickup Date", systemImage: "calendar")
                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                            .foregroundColor(Theme.textMauve)
                        
                        DatePicker(
                            "Delivery Date",
                            selection: $deliveryDate,
                            in: Date()...,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                        .datePickerStyle(.graphical)
                        .tint(Theme.deepRose)
                        .padding(.vertical, 4)
                    }
                } header: {
                    Text("Client & Schedule")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
                
                // Section 2: Cake Specifications
                Section {
                    Picker("Cake Type", selection: $cakeType) {
                        ForEach(cakeTypes, id: \.self) { type in
                            Text(type).tag(type)
                        }
                    }
                    
                    Picker("Shape", selection: $shape) {
                        ForEach(shapes, id: \.self) { item in
                            Text(item).tag(item)
                        }
                    }
                    
                    Picker("Flavor & Filling", selection: $flavor) {
                        ForEach(flavors, id: \.self) { item in
                            Text(item).tag(item)
                        }
                    }
                } header: {
                    Text("Cake Specifications")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
                
                // Section 3: Status & Pricing
                Section {
                    Picker("Initial Status", selection: $status) {
                        ForEach(OrderStatus.allCases) { s in
                            Text(s.rawValue).tag(s)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.vertical, 4)
                    
                    HStack {
                        Label("Quoted Price", systemImage: "dollarsign.circle.fill")
                            .foregroundColor(Theme.roseGold)
                        Spacer()
                        TextField("Price", value: $quotedPrice, format: .currency(code: "USD"))
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .fontWeight(.semibold)
                    }
                } header: {
                    Text("Status & Financials")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
                
                // Section 4: Design Sketches & Reference Photos
                Section {
                    PhotosPicker(
                        selection: $selectedPhotoItems,
                        maxSelectionCount: 5,
                        matching: .images
                    ) {
                        HStack {
                            Image(systemName: "photo.badge.plus")
                                .font(.system(size: 18))
                                .foregroundColor(Theme.deepRose)
                            Text(referenceImages.isEmpty ? "Attach Sketches or Inspo Photos" : "Add / Replace Photos")
                                .font(.system(size: 15, weight: .medium, design: .rounded))
                                .foregroundColor(Theme.textDark)
                            Spacer()
                            if isProcessingPhotos {
                                ProgressView()
                            } else {
                                Text("\(referenceImages.count)/5")
                                    .font(.caption)
                                    .foregroundColor(Theme.textSecondary)
                            }
                        }
                    }
                    .onChange(of: selectedPhotoItems) { _, newItems in
                        loadPhotos(from: newItems)
                    }
                    
                    if !referenceImages.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 12) {
                                ForEach(Array(referenceImages.enumerated()), id: \.offset) { index, data in
                                    if let uiImage = UIImage(data: data) {
                                        ZStack(alignment: .topTrailing) {
                                            Image(uiImage: uiImage)
                                                .resizable()
                                                .scaledToFill()
                                                .frame(width: 80, height: 80)
                                                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                        .stroke(Theme.pastelRose, lineWidth: 1.5)
                                                )
                                            
                                            Button(action: {
                                                withAnimation {
                                                    _ = referenceImages.remove(at: index)
                                                }
                                            }) {
                                                Image(systemName: "xmark.circle.fill")
                                                    .foregroundColor(.white)
                                                    .background(Circle().fill(Color.black.opacity(0.6)))
                                                    .font(.system(size: 18))
                                            }
                                            .offset(x: 6, y: -6)
                                        }
                                        .padding(.top, 6)
                                    }
                                }
                            }
                            .padding(.vertical, 8)
                        }
                    }
                } header: {
                    Text("Design Sketches & Inspo Photos")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
                
                // Section 5: Custom Requirements & Notes
                Section {
                    ZStack(alignment: .topLeading) {
                        if customRequirements.isEmpty {
                            Text("e.g. Edible gold leaf on top edge, gluten-free base, message 'Happy 30th Sophia' written in mauve script...")
                                .foregroundColor(Theme.textSecondary.opacity(0.7))
                                .padding(.top, 8)
                                .font(.system(size: 14, design: .rounded))
                        }
                        TextEditor(text: $customRequirements)
                            .frame(minHeight: 90)
                            .font(.system(size: 14, design: .rounded))
                    }
                } header: {
                    Text("Custom Requirements & Dietary Notes")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.textMauve)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.cream.ignoresSafeArea())
            .navigationTitle(orderToEdit == nil ? "New Cake Order" : "Edit Cake Order")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        HapticManager.shared.impact(style: .light)
                        dismiss()
                    }
                    .foregroundColor(Theme.textMauve)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button(orderToEdit == nil ? "Save Order" : "Update") {
                        saveOrder()
                    }
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(Theme.deepRose)
                    .disabled(customerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .onAppear {
                populateIfEditing()
            }
        }
    }
    
    private func populateIfEditing() {
        guard let order = orderToEdit else { return }
        customerName = order.customerName
        deliveryDate = order.deliveryDate
        cakeType = order.cakeType
        shape = order.shape
        flavor = order.flavor
        customRequirements = order.customRequirements
        status = order.status
        quotedPrice = order.quotedPrice
        referenceImages = order.referenceImages
    }
    
    private func loadPhotos(from items: [PhotosPickerItem]) {
        guard !items.isEmpty else { return }
        isProcessingPhotos = true
        
        Task {
            var loadedData: [Data] = []
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self) {
                    loadedData.append(data)
                }
            }
            await MainActor.run {
                self.referenceImages.append(contentsOf: loadedData)
                self.selectedPhotoItems.removeAll()
                self.isProcessingPhotos = false
            }
        }
    }
    
    private func saveOrder() {
        let trimmedName = customerName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedName.isEmpty else { return }
        
        HapticManager.shared.notification(type: .success)
        
        if let order = orderToEdit {
            order.customerName = trimmedName
            order.deliveryDate = deliveryDate
            order.cakeType = cakeType
            order.shape = shape
            order.flavor = flavor
            order.customRequirements = customRequirements
            order.status = status
            order.quotedPrice = quotedPrice
            order.referenceImages = referenceImages
        } else {
            let newOrder = Order(
                customerName: trimmedName,
                deliveryDate: deliveryDate,
                cakeType: cakeType,
                shape: shape,
                flavor: flavor,
                customRequirements: customRequirements,
                status: status,
                quotedPrice: quotedPrice,
                referenceImages: referenceImages
            )
            modelContext.insert(newOrder)
        }
        
        try? modelContext.save()
        dismiss()
    }
}

#Preview {
    OrderEntryView()
        .modelContainer(for: Order.self, inMemory: true)
}

