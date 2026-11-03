//
//  FirebaseManager.swift
//  SweetBake
//

import Foundation
#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebaseAuth)
import FirebaseAuth
#endif
#if canImport(FirebaseFirestore)
import FirebaseFirestore
#endif

/// Manager to configure Firebase in the SweetBake native iOS app
public final class FirebaseManager: ObservableObject {
    public static let shared = FirebaseManager()
    
    @Published public var isConfigured: Bool = false
    @Published public var currentUserId: String? = nil
    @Published public var currentUserEmail: String? = nil
    
    private init() {}
    
    /// Initializes Firebase if GoogleService-Info.plist is present and FirebaseCore is linked
    public func configure() {
        #if canImport(FirebaseCore)
        if FirebaseApp.app() == nil {
            if let _ = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") {
                FirebaseApp.configure()
                self.isConfigured = true
                print("[FirebaseManager] Successfully configured Firebase with GoogleService-Info.plist")
                
                #if canImport(FirebaseAuth)
                if let user = Auth.auth().currentUser {
                    self.currentUserId = user.uid
                    self.currentUserEmail = user.email
                }
                Auth.auth().addStateDidChangeListener { [weak self] _, user in
                    DispatchQueue.main.async {
                        self?.currentUserId = user?.uid
                        self?.currentUserEmail = user?.email
                    }
                }
                #endif
            } else {
                print("[FirebaseManager] Warning: GoogleService-Info.plist not found in bundle.")
            }
        }
        #else
        print("[FirebaseManager] Note: FirebaseCore Swift Package not linked yet in Xcode target. Please add https://github.com/firebase/firebase-ios-sdk to your Xcode project.")
        #endif
    }
}

