//
//  BusinessNeedsView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct BusinessNeedsView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \GeneralRequirement.createdAt, order: .forward) private var allRequirements: [GeneralRequirement]
    
    @State private var selectedCategory: RequirementCategory = .ingredients
    @State private var newRequirementTitle: String = ""
    @State private var isAddingQuickItem: Bool = false
    
    // Checked items visually strike through and move to the bottom of the list
    private var filteredAndSortedRequirements: [GeneralRequirement] {
        let matchingCategory = allRequirements.filter { $0.category == selectedCategory }
        let unchecked = matchingCategory.filter { !$0.isCompleted }
        let checked = matchingCategory.filter { $0.isCompleted }
        return unchecked + checked
    }
    
    private var completedCount: Int {
        allRequirements.filter { $0.category == selectedCategory && $0.isCompleted }.count
    }
    
    private var totalCount: Int {
        allRequirements.filter { $0.category == selectedCategory }.count
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Category Segmented Selector
                VStack(spacing: 12) {
                    HStack(spacing: 8) {
                        ForEach(RequirementCategory.allCases) { category in
                            CategoryTabButton(
                                category: category,
                                isSelected: selectedCategory == category,
                                count: allRequirements.filter { $0.category == category && !$0.isCompleted }.count
                            ) {
                                HapticManager.shared.selection()
                                withAnimation(.spring(response: 0.3)) {
                                    selectedCategory = category
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    
                    // Progress banner
                    if totalCount > 0 {
                        HStack {
                            Text("\(completedCount) of \(totalCount) completed")
                                .font(.system(size: 12, weight: .medium, design: .rounded))
                                .foregroundColor(Theme.textSecondary)
                            
                            Spacer()
                            
                            ProgressView(value: Double(completedCount), total: Double(totalCount))
                                .progressViewStyle(LinearProgressViewStyle(tint: Theme.deepRose))
                                .frame(width: 100)
                        }
                        .padding(.horizontal, 20)
                        .padding(.bottom, 6)
                    }
                }
                .background(Theme.cream)
                
                // Checklist
                List {
                    // Quick-add input box
                    Section {
                        HStack(spacing: 10) {
                            Image(systemName: selectedCategory.iconName)
                                .foregroundColor(Theme.deepRose)
                                .font(.system(size: 16))
                            
                            TextField("Add new \(selectedCategory.rawValue.lowercased()) item...", text: $newRequirementTitle)
                                .font(.system(size: 15, design: .rounded))
                                .onSubmit {
                                    addNewRequirement()
                                }
                            
                            if !newRequirementTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                                Button(action: addNewRequirement) {
                                    Image(systemName: "arrow.up.circle.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(Theme.deepRose)
                                }
                                .buttonStyle(ScaleButtonStyle())
                            }
                        }
                        .padding(.vertical, 8)
                        .listRowBackground(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.white)
                                .shadow(color: Theme.textDark.opacity(0.04), radius: 6, y: 3)
                        )
                        .listRowSeparator(.hidden)
                    }
                    
                    // List of items
                    Section {
                        if filteredAndSortedRequirements.isEmpty {
                            EmptyStateView(
                                title: "No \(selectedCategory.rawValue) Needed",
                                subtitle: "Your inventory checklist is clear! Type above to add supplies or tools."
                            )
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        } else {
                            ForEach(filteredAndSortedRequirements) { item in
                                RequirementRowView(item: item) {
                                    toggleRequirement(item)
                                }
                                .listRowBackground(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .fill(item.isCompleted ? Color.white.opacity(0.55) : Color.white)
                                        .shadow(color: Theme.textDark.opacity(0.03), radius: 4, y: 2)
                                )
                                .listRowSeparator(.hidden)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        deleteRequirement(item)
                                    } label: {
                                        Label("Delete", systemImage: "trash")
                                    }
                                }
                            }
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Theme.cream.ignoresSafeArea())
            }
            .background(Theme.cream.ignoresSafeArea())
            .navigationTitle("Business Needs")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !allRequirements.filter({ $0.category == selectedCategory && $0.isCompleted }).isEmpty {
                        Button("Clear Done") {
                            clearCompletedForCurrentCategory()
                        }
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .foregroundColor(Theme.deepRose)
                    }
                }
            }
        }
    }
    
    private func addNewRequirement() {
        let trimmed = newRequirementTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        HapticManager.shared.impact(style: .light)
        let requirement = GeneralRequirement(
            title: trimmed,
            category: selectedCategory,
            isCompleted: false
        )
        
        withAnimation(.spring(response: 0.35)) {
            modelContext.insert(requirement)
            try? modelContext.save()
            newRequirementTitle = ""
        }
    }
    
    private func toggleRequirement(_ item: GeneralRequirement) {
        // Haptic feedback for checking off tasks
        HapticManager.shared.impact(style: .medium)
        
        withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
            item.isCompleted.toggle()
            try? modelContext.save()
        }
    }
    
    private func deleteRequirement(_ item: GeneralRequirement) {
        HapticManager.shared.notification(type: .warning)
        withAnimation {
            modelContext.delete(item)
            try? modelContext.save()
        }
    }
    
    private func clearCompletedForCurrentCategory() {
        HapticManager.shared.notification(type: .success)
        let completed = allRequirements.filter { $0.category == selectedCategory && $0.isCompleted }
        withAnimation {
            for item in completed {
                modelContext.delete(item)
            }
            try? modelContext.save()
        }
    }
}

// Category pill button
private struct CategoryTabButton: View {
    let category: RequirementCategory
    let isSelected: Bool
    let count: Int
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: category.iconName)
                    .font(.system(size: 12))
                
                Text(category.rawValue)
                    .font(.system(size: 13, weight: isSelected ? .bold : .medium, design: .rounded))
                
                if count > 0 {
                    Text("\(count)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.25) : Theme.blushPink)
                        .foregroundColor(isSelected ? .white : Theme.deepRose)
                        .clipShape(Capsule())
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(isSelected ? Theme.deepRose : Color.white)
            .foregroundColor(isSelected ? .white : Theme.textDark)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .shadow(color: Theme.textDark.opacity(isSelected ? 0.12 : 0.03), radius: 5, y: 2)
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(isSelected ? Theme.deepRose : Theme.pastelRose.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(ScaleButtonStyle(scaleAmount: 0.96))
    }
}

// Requirement Row
private struct RequirementRowView: View {
    let item: GeneralRequirement
    let onToggle: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                ZStack {
                    Circle()
                        .stroke(item.isCompleted ? Theme.deliveredGreenDark : Theme.pastelRose, lineWidth: 2)
                        .frame(width: 24, height: 24)
                    
                    if item.isCompleted {
                        Circle()
                            .fill(Theme.deliveredGreenDark)
                            .frame(width: 24, height: 24)
                        
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundColor(.white)
                    }
                }
            }
            .buttonStyle(ScaleButtonStyle(scaleAmount: 0.88))
            
            Text(item.title)
                .font(.system(size: 15, weight: item.isCompleted ? .regular : .medium, design: .rounded))
                .foregroundColor(item.isCompleted ? Theme.textSecondary : Theme.textDark)
                .strikethrough(item.isCompleted, color: Theme.textSecondary)
                .animation(.spring(response: 0.3), value: item.isCompleted)
            
            Spacer()
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
        .onTapGesture {
            onToggle()
        }
    }
}

#Preview {
    BusinessNeedsView()
        .modelContainer(for: GeneralRequirement.self, inMemory: true)
}

