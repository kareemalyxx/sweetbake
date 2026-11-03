//
//  SweetBakeWidgetBundle.swift
//  SweetBakeWidgets
//

import WidgetKit
import SwiftUI

@main
struct SweetBakeWidgetBundle: WidgetBundle {
    var body: some Widget {
        UpcomingOrderWidget()
        NeededAddonsWidget()
    }
}
