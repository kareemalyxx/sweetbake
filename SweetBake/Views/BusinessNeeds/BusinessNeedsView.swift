import SwiftUI

// MARK: - Premium Native iOS Business Needs & Checklist View (HIG & Accessibility Compliant)
public struct BusinessNeedsView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    @Binding public var requirements: [GeneralRequirement]
    @State private var selectedCategory: RequirementCategory = .addons
    @State private var newItemTitle: String = ""
    
    public init(requirements: Binding<[GeneralRequirement]>) {
        self._requirements = requirements
    }
    
    private var filteredItems: [GeneralRequirement] {
        let items = requirements.filter { $0.category == selectedCategory }
        let uncompleted = items.filter { !$0.isCompleted }
        let completed = items.filter { $0.isCompleted }
        return uncompleted + completed
    }
    
    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category Pills Segmented Selector with 44pt Touch Targets
                categorySelectorBar
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .background(Theme.Colors.secondaryBackground)
                
                Divider()
                
                // Quick Add Input Box
                quickAddBar
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                
                // Progress Sub-header
                statusSubHeader
                    .padding(.horizontal, 20)
                    .padding(.vertical, 4)
                
                // List of To-Do items in InsetGrouped Style
                if filteredItems.isEmpty {
                    Spacer()
                    EmptyStateView(
                        title: "No \(selectedCategory.rawValue) Needs",
                        message: "All \(selectedCategory.rawValue.lowercased()) tasks are completed! Type above to add supplies.",
                        systemImage: selectedCategory.iconName
                    )
                    Spacer()
                } else {
                    List {
                        Section {
                            ForEach(filteredItems) { item in
                                RequirementRow(item: item) {
                                    toggleRequirement(item)
                                }
                            }
                            .onDelete(perform: deleteRequirement)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                    .background(Color(UIColor.systemGroupedBackground))
                }
            }
            .background(Color(UIColor.systemGroupedBackground))
            .navigationTitle("Kitchen Checklist")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    let hasCompleted = requirements.contains { $0.category == selectedCategory && $0.isCompleted }
                    if hasCompleted {
                        Button("Clear Done") {
                            HapticManager.light()
                            if reduceMotion {
                                requirements.removeAll { $0.category == selectedCategory && $0.isCompleted }
                            } else {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    requirements.removeAll { $0.category == selectedCategory && $0.isCompleted }
                                }
                            }
                        }
                        .tint(Theme.Colors.deepRose)
                        .font(.subheadline.weight(.semibold))
                        .frame(minWidth: 44, minHeight: 44)
                        .accessibilityLabel("Clear completed checklist items")
                    }
                }
            }
        }
    }
    
    // MARK: - Category Selector Bar (44pt Minimum Height)
    private var categorySelectorBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(RequirementCategory.allCases, id: \.self) { cat in
                    let isSelected = selectedCategory == cat
                    let pendingCount = requirements.filter { $0.category == cat && !$0.isCompleted }.count
                    
                    Button {
                        HapticManager.selection()
                        if reduceMotion {
                            selectedCategory = cat
                        } else {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                selectedCategory = cat
                            }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: cat.iconName)
                                .symbolRenderingMode(.hierarchical)
                                .font(.caption)
                            
                            Text(cat.rawValue)
                                .font(.subheadline.weight(isSelected ? .bold : .medium))
                            
                            if pendingCount > 0 {
                                Text("\(pendingCount)")
                                    .font(.caption2.weight(.bold))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Capsule().fill(isSelected ? Color.white.opacity(0.3) : Theme.Colors.blushPink))
                                    .foregroundColor(isSelected ? .white : Theme.Colors.deepRose)
                            }
                        }
                        .padding(.horizontal, 14)
                        .frame(minHeight: 44)
                        .background(
                            Capsule()
                                .fill(isSelected ? Theme.Colors.deepRose : Theme.Colors.warmIvory)
                        )
                        .foregroundColor(isSelected ? .white : Theme.Colors.textDark)
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(cat.rawValue) category, \(pendingCount) items pending")
                    .accessibilityAddTraits(isSelected ? [.isSelected, .isButton] : [.isButton])
                }
            }
            .padding(.vertical, 2)
        }
    }
    
    // MARK: - Quick Add Bar
    private var quickAddBar: some View {
        HStack(spacing: 10) {
            Image(systemName: selectedCategory.iconName)
                .symbolRenderingMode(.hierarchical)
                .foregroundColor(Theme.Colors.deepRose)
                .font(.body)
                .accessibilityHidden(true)
            
            TextField("Add \(selectedCategory.rawValue.lowercased()) requirement...", text: $newItemTitle)
                .font(.subheadline)
                .submitLabel(.done)
                .onSubmit(addNewItem)
            
            if !newItemTitle.trimmingCharacters(in: .whitespaces).isEmpty {
                Button(action: addNewItem) {
                    Image(systemName: "arrow.up.circle.fill")
                        .symbolRenderingMode(.multicolor)
                        .font(.title2)
                        .foregroundColor(Theme.Colors.deepRose)
                        .frame(minWidth: 44, minHeight: 44)
                        .contentShape(Rectangle())
                }
                .accessibilityLabel("Add to-do item")
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(Theme.Colors.secondaryBackground)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Theme.Colors.border, lineWidth: 1)
        )
    }
    
    // MARK: - Sub Header
    private var statusSubHeader: some View {
        let uncompleted = filteredItems.filter { !$0.isCompleted }.count
        let completed = filteredItems.filter { $0.isCompleted }.count
        
        return HStack {
            Text("\(uncompleted) to do • \(completed) completed")
                .font(.caption.weight(.medium))
                .foregroundColor(Color(UIColor.secondaryLabel))
            Spacer()
        }
    }
    
    private func addNewItem() {
        let trimmed = newItemTitle.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        HapticManager.light()
        if reduceMotion {
            requirements.insert(
                GeneralRequirement(
                    title: trimmed,
                    category: selectedCategory
                ),
                at: 0
            )
            newItemTitle = ""
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                requirements.insert(
                    GeneralRequirement(
                        title: trimmed,
                        category: selectedCategory
                    ),
                    at: 0
                )
                newItemTitle = ""
            }
        }
    }
    
    private func toggleRequirement(_ item: GeneralRequirement) {
        guard let index = requirements.firstIndex(where: { $0.id == item.id }) else { return }
        HapticManager.medium()
        if reduceMotion {
            requirements[index].isCompleted.toggle()
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                requirements[index].isCompleted.toggle()
            }
        }
    }
    
    private func deleteRequirement(at offsets: IndexSet) {
        HapticManager.light()
        if reduceMotion {
            let itemsToDelete = offsets.map { filteredItems[$0].id }
            requirements.removeAll { itemsToDelete.contains($0.id) }
        } else {
            withAnimation(.easeInOut(duration: 0.2)) {
                let itemsToDelete = offsets.map { filteredItems[$0].id }
                requirements.removeAll { itemsToDelete.contains($0.id) }
            }
        }
    }
}

// MARK: - Requirement Row View (Accessible Checkbox with 44pt Touch Target)
struct RequirementRow: View {
    let item: GeneralRequirement
    let onToggle: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: item.isCompleted ? "checkmark.circle.fill" : "circle")
                    .symbolRenderingMode(item.isCompleted ? .hierarchical : .monochrome)
                    .font(.title3)
                    .foregroundColor(item.isCompleted ? Color(UIColor.systemGreen) : Theme.Colors.pastelRose)
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(item.title)
            .accessibilityValue(item.isCompleted ? "Completed" : "Incomplete")
            .accessibilityHint("Double tap to toggle completion status")
            
            VStack(alignment: .leading, spacing: 2) {
                Text(item.title)
                    .font(.body)
                    .strikethrough(item.isCompleted)
                    .foregroundColor(item.isCompleted ? Color(UIColor.secondaryLabel) : Theme.Colors.textDark)
                
                if item.category == .addons {
                    Text("Add-on Item")
                        .font(.caption2.weight(.semibold))
                        .foregroundColor(Theme.Colors.deepRose)
                }
            }
            
            Spacer()
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
        .onTapGesture(perform: onToggle)
    }
}

extension RequirementCategory {
    var iconName: String {
        switch self {
        case .addons: return "sparkles"
        case .ingredients: return "cup.and.saucer.fill"
        case .packaging: return "shippingbox.fill"
        case .tools: return "wrench.and.screwdriver.fill"
        }
    }
}
