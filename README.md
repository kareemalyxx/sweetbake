# SweetBake Studio 🎂✨
### Bespoke Custom Cake Business iOS App (SwiftUI + SwiftData)

A native iOS application designed for artisan cake makers and custom bakery studios. Built using modern declarative **SwiftUI** patterns, **SwiftData** for persistent offline-first storage, dynamic animations, and tactile haptic feedback.

---

## 🎨 Aesthetic & UI/UX Design
- **Feminine Pastel Palette**:
  - Blush Pink (`#FAE4E8`), Pastel Rose (`#F4B8C4`), Deep Rose (`#DB7093`), Rose Gold (`#B76E79`)
  - Cream & Warm Ivory backgrounds (`#FEFBF6`)
  - Lavender Accents (`#F0EBF8`)
  - High-contrast Deep Charcoal (`#2C2830`) and Mauve (`#5A4858`) for crisp readability.
- **Typography & Geometry**:
  - SF Pro Rounded typography across headers, badges, and numbers.
  - Smooth 16pt–20pt continuous corner radii with soft border strokes and subtle dropshadows.
  - Interactive scale animations (`ScaleButtonStyle`) that physically depress on tap with spring physics.
- **Haptic Feedback**:
  - `UIImpactFeedbackGenerator` and `UINotificationFeedbackGenerator` tuned for order creation, status swipes, tab selection, and striking through checklist items.

---

## 🏗 Architecture & SwiftData Models

### 1. `Order`
Persistent entity representing custom commission orders:
- `id`: `UUID`
- `customerName`: `String`
- `deliveryDate`: `Date`
- `cakeType`: `String` ( Birthday Cake, Bento Box Cake, Celebration Cake, Tiered Wedding Cake, etc.)
- `shape`: `String` (Round, Heart, Square, Multi-tiered, etc.)
- `flavor`: `String` ( Kinder, Matilda, Red velvet, Tiramisu, White Chocolate Raspberry, etc.)
- `customRequirements`: `String` (Dietary notes, lettering, piping requirements)
- `status`: `OrderStatus` enum (`Pending`, `Baking`, `Decorating`, `Delivered`)
- `quotedPrice`: `Double`
- `referenceImages`: `[Data]` (Customer sketches, color swatch photos, inspiration boards)

### 2. `GeneralRequirement`
Persistent entity managing bakery supply runs and workflow:
- `id`: `UUID`
- `title`: `String`
- `category`: `RequirementCategory` enum (`Ingredients`, `Packaging`, `Tools`)
- `isCompleted`: `Bool`
- `createdAt`: `Date`

---

## 📱 Core Views & Feature Breakdown

### 1. Dashboard (Main Tab)
- **Next 7 Days Rush Widget**: Interactive 7-day strip showcasing bakes due in the immediate pipeline.
- **Monthly Revenue Tracker**: Visual progress bar and dual-card breakdown calculating pending orders vs. fulfilled commissions for the active month.
- **Order Feed**: Chronologically sorted by `deliveryDate` ascending.
- **Search & Filtering**: Full `.searchable` support filtering across client names, cake types, and flavors, along with horizontal one-tap filter pills (`All`, `Pending`, `Baking`, `Decorating`, `Delivered`).
- **Interactive Swipe Actions**:
  - Swipe right (leading): Progress order to next status (`Pending` ➔ `Baking` ➔ `Decorating` ➔ `Delivered`).
  - Swipe left (trailing): Delete or revert order.
- **Floating Action Button (FAB)**: Rose gold gradient button to quickly launch the order creation modal.

### 2. Order Entry Form
- Graphical native `DatePicker` for selecting exact pickup/delivery dates and times.
- Native `Picker` elements for cake types, shapes, flavors, and status.
- `PhotosPicker` integration for attaching up to 5 design sketches and inspiration images with thumbnail previews and removal badges.
- Custom requirement `TextEditor` and currency-formatted price input.

### 3. Calendar View (Second Tab)
- Month-by-month grid with smooth navigation.
- Color-coded status dots (`Orange` for Pending, `Blue` for Baking, `Purple` for Decorating, `Green` for Delivered) marking days with scheduled deliveries.
- Day detail tray displaying orders due on that date with an immediate "Add Bake" shortcut.

### 4. Business Needs Tracker (Third Tab)
- Segmented category tabs (`Ingredients`, `Packaging`, `Tools`) with remaining badge counts.
- Dynamic quick-add textfield at the top with inline submission.
- **Automatic Reordering & Strikethrough**: Checking an item off triggers tactile haptics, animates a strikethrough, and moves the item to the bottom of the list.
- One-tap "Clear Done" action in the toolbar to batch-clean finished tasks.

### 5. Custom Empty States
- Custom vector illustration of a glass-domed cake stand on a rose gold pedestal with sparkling elements (`EmptyCakeStandIllustration`) for when order lists or task categories are empty.

---

## 📂 Project Structure

```
SweetBake/
├── SweetBakeApp.swift                      # App Entry Point & SwiftData Schema Configuration
├── ContentView.swift                        # TabView Navigation & Sample Data bootstrap
├── Models/
│   ├── Order.swift                          # SwiftData @Model for custom cake orders
│   └── GeneralRequirement.swift             # SwiftData @Model for bakery checklist
├── Theme/
│   └── Theme.swift                          # Colors, gradients, typography & styling modifiers
├── Utilities/
│   ├── HapticManager.swift                  # Haptic feedback wrapper
│   └── SampleDataLoader.swift              # Starter bakery data loader
└── Views/
    ├── Components/
    │   ├── StatusPillView.swift             # Color-coded status badge
    │   └── EmptyStateView.swift             # Empty cake stand illustration & state
    ├── Dashboard/
    │   ├── DashboardView.swift              # Main feed, FAB & search
    │   ├── NextSevenDaysWidget.swift        # Upcoming week timeline
    │   ├── RevenueTrackerView.swift         # Monthly pipeline vs delivered revenue
    │   ├── OrderRowView.swift               # Order card with thumbnail & status
    │   └── OrderDetailView.swift            # Detailed inspection & edit sheet
    ├── OrderEntry/
    │   └── OrderEntryView.swift             # Comprehensive commission creation form
    ├── Calendar/
    │   └── CalendarView.swift               # Visual monthly calendar & daily schedule
    └── BusinessNeeds/
        └── BusinessNeedsView.swift          # Dynamic checklist with animated strikethrough
```

---

## 🚀 How to Run in Xcode
1. Open Xcode and select **Create New Project** -> **iOS App** -> **SwiftUI** interface with **SwiftData** storage.
2. Drag the `SweetBake` folder files into your Xcode project navigator.
3. Select an iOS Simulator (e.g. iPhone 15/16 Pro) and hit **Cmd + R** to run.

