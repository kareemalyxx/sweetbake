//
//  ContentView.swift
//  SweetBake
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem {
                    Label("Orders", systemImage: "birthday.cake.fill")
                }
                .tag(0)
            
            CalendarBakeView()
                .tabItem {
                    Label("Schedule", systemImage: "calendar")
                }
                .tag(1)
            
            BusinessNeedsView()
                .tabItem {
                    Label("Checklist", systemImage: "checklist")
                }
                .tag(2)
        }
        .tint(Theme.deepRose)
        .onAppear {
            SampleDataLoader.insertSampleDataIfNeeded(context: modelContext)
            configureTabBarAppearance()
        }
    }
    
    private func configureTabBarAppearance() {
        let appearance = UITabBarAppearance()
        appearance.configureWithDefaultBackground()
        appearance.backgroundColor = UIColor(Color(UIColor.systemBackground))
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Order.self, GeneralRequirement.self], inMemory: true)
}

