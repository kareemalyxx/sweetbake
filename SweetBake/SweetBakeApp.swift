// xcode: set sdk=iOS

//
//  SweetBakeApp.swift
//  SweetBake
//

import SwiftUI
import SwiftData

@main
struct SweetBakeApp: App {
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            Order.self,
            GeneralRequirement.self
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        
        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()
    
    init() {
        FirebaseManager.shared.configure()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(sharedModelContainer)
    }
}

