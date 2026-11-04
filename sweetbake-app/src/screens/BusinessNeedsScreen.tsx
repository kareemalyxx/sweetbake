import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GeneralRequirement, RequirementCategory, CakeOrder } from '../types';
import { Theme } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { triggerHaptic } from '../services/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterCategory = RequirementCategory | 'All';
type ViewGroupingMode = 'Category' | 'ByCake';

interface BusinessNeedsScreenProps {
  requirements: GeneralRequirement[];
  orders?: CakeOrder[];
  onToggleRequirement: (id: string, expenseAmount?: number) => void;
  onAddRequirement: (title: string, category: RequirementCategory, orderId?: string) => void;
  onDeleteRequirement: (id: string) => void;
  onClearCompleted: (category?: RequirementCategory) => void;
}

/**
 * Returns deadline proximity tag details based on time left till delivery:
 * 15 min, 30 min, 1 hour, 3 hour, 6 hour, 12 hour, 24 hour, 48 hour, or Overdue.
 */
export function getDeadlineTag(deliveryDateIso?: string): {
  label: string;
  isUrgent: boolean;
  color: string;
  bgColor: string;
} | null {
  if (!deliveryDateIso) return null;
  const now = Date.now();
  const deliveryMs = new Date(deliveryDateIso).getTime();
  if (isNaN(deliveryMs)) return null;

  const diffMs = deliveryMs - now;
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 0) {
    return {
      label: 'Overdue',
      isUrgent: true,
      color: '#DC2626',
      bgColor: '#FEE2E2',
    };
  } else if (diffMinutes <= 15) {
    return {
      label: '15 min',
      isUrgent: true,
      color: '#B91C1C',
      bgColor: '#FEE2E2',
    };
  } else if (diffMinutes <= 30) {
    return {
      label: '30 min',
      isUrgent: true,
      color: '#C2410C',
      bgColor: '#FFEDD5',
    };
  } else if (diffMinutes <= 60) {
    return {
      label: '1 hour',
      isUrgent: true,
      color: '#EA580C',
      bgColor: '#FFEDD5',
    };
  } else if (diffMinutes <= 3 * 60) {
    return {
      label: '3 hour',
      isUrgent: true,
      color: '#D97706',
      bgColor: '#FEF3C7',
    };
  } else if (diffMinutes <= 6 * 60) {
    return {
      label: '6 hour',
      isUrgent: false,
      color: '#CA8A04',
      bgColor: '#FEF9C3',
    };
  } else if (diffMinutes <= 12 * 60) {
    return {
      label: '12 hour',
      isUrgent: false,
      color: '#2563EB',
      bgColor: '#DBEAFE',
    };
  } else if (diffMinutes <= 24 * 60) {
    return {
      label: '24 hour',
      isUrgent: false,
      color: '#4F46E5',
      bgColor: '#EEF2FF',
    };
  } else if (diffMinutes <= 48 * 60) {
    return {
      label: '48 hour',
      isUrgent: false,
      color: '#7C3AED',
      bgColor: '#F3E8FF',
    };
  }

  return null;
}

export const BusinessNeedsScreen: React.FC<BusinessNeedsScreenProps> = ({
  requirements,
  orders = [],
  onToggleRequirement,
  onAddRequirement,
  onDeleteRequirement,
  onClearCompleted,
}) => {
  const [viewMode, setViewMode] = useState<ViewGroupingMode>('Category');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [selectedCakeOrderId, setSelectedCakeOrderId] = useState<string>('All');
  const [newTitle, setNewTitle] = useState('');

  // Map orderId -> CakeOrder for fast lookup
  const orderMap = useMemo(() => {
    const map = new Map<string, CakeOrder>();
    orders.forEach((o) => map.set(o.id, o));
    return map;
  }, [orders]);

  // Distinct cakes list that have requirements, sorted by earliest delivery date
  const cakeOptions = useMemo(() => {
    // Collect orderIds from requirements
    const orderIds = new Set<string>();
    requirements.forEach((r) => {
      if (r.orderId) orderIds.add(r.orderId);
    });

    const list: Array<{
      orderId: string;
      order?: CakeOrder;
      customerName: string;
      cakeType: string;
      deliveryDate?: string;
      reqCount: number;
      pendingCount: number;
    }> = [];

    // General requirements not linked to any order
    const generalReqs = requirements.filter((r) => !r.orderId);
    if (generalReqs.length > 0) {
      list.push({
        orderId: 'general',
        customerName: 'General Bakery',
        cakeType: 'Pantry / Supplies',
        reqCount: generalReqs.length,
        pendingCount: generalReqs.filter((r) => !r.isCompleted).length,
      });
    }

    orderIds.forEach((id) => {
      const order = orderMap.get(id);
      const reqsForOrder = requirements.filter((r) => r.orderId === id);
      list.push({
        orderId: id,
        order,
        customerName: order?.customerName || 'Cake Order',
        cakeType: order?.cakeType || 'Custom Cake',
        deliveryDate: order?.deliveryDate,
        reqCount: reqsForOrder.length,
        pendingCount: reqsForOrder.filter((r) => !r.isCompleted).length,
      });
    });

    // Sort cakes with earliest upcoming delivery deadlines first
    return list.sort((a, b) => {
      if (a.orderId === 'general') return 1;
      if (b.orderId === 'general') return -1;
      const timeA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
      const timeB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
      return timeA - timeB;
    });
  }, [requirements, orderMap]);

  // Expense modal state when marking an item as completed
  const [pendingCompleteItem, setPendingCompleteItem] = useState<GeneralRequirement | null>(null);
  const [expenseInput, setExpenseInput] = useState('');

  // Filter items based on active viewMode
  const filteredItems = useMemo(() => {
    if (viewMode === 'ByCake') {
      if (selectedCakeOrderId === 'All') {
        return requirements;
      }
      if (selectedCakeOrderId === 'general') {
        return requirements.filter((r) => !r.orderId);
      }
      return requirements.filter((r) => r.orderId === selectedCakeOrderId);
    } else {
      // Category Mode
      if (selectedCategory === 'All') {
        return requirements;
      }
      return requirements.filter((r) => r.category === selectedCategory);
    }
  }, [viewMode, selectedCategory, selectedCakeOrderId, requirements]);

  const uncompleted = filteredItems.filter((r) => !r.isCompleted);
  const completed = filteredItems.filter((r) => r.isCompleted);
  const sortedItems = [...uncompleted, ...completed];

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    triggerHaptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const targetCat: RequirementCategory =
      viewMode === 'Category' && selectedCategory !== 'All'
        ? selectedCategory
        : 'Add-ons';
    const targetOrderId =
      viewMode === 'ByCake' && selectedCakeOrderId !== 'All' && selectedCakeOrderId !== 'general'
        ? selectedCakeOrderId
        : undefined;

    onAddRequirement(newTitle.trim(), targetCat, targetOrderId);
    setNewTitle('');
  };

  const handleItemPress = (item: GeneralRequirement) => {
    if (!item.isCompleted) {
      // Prompt for expense amount when checking as true / completed
      triggerHaptic.medium();
      setPendingCompleteItem(item);
      setExpenseInput('');
    } else {
      // Unchecking does not ask for expenses
      triggerHaptic.light();
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      onToggleRequirement(item.id);
    }
  };

  const confirmCompletionWithExpense = (recordExpense: boolean) => {
    if (!pendingCompleteItem) return;
    const parsedAmount = recordExpense ? parseFloat(expenseInput) : undefined;
    const validAmount = !isNaN(parsedAmount as number) && (parsedAmount as number) > 0 ? parsedAmount : undefined;

    triggerHaptic.success();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    onToggleRequirement(pendingCompleteItem.id, validAmount);
    setPendingCompleteItem(null);
    setExpenseInput('');
  };

  const getCategoryIcon = (cat: FilterCategory) => {
    switch (cat) {
      case 'All':
        return 'layers-outline' as const;
      case 'Add-ons':
        return 'sparkles' as const;
      case 'Ingredients':
        return 'cafe' as const;
      case 'Packaging':
        return 'cube' as const;
      case 'Tools':
        return 'construct' as const;
    }
  };

  const categories: FilterCategory[] = ['All', 'Add-ons', 'Ingredients', 'Packaging', 'Tools'];

  return (
    <View style={styles.container}>
      {/* Mode Switcher: By Category vs. By Cake */}
      <View style={styles.viewModeToggleRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'Category' && styles.viewModeBtnActive]}
          onPress={() => {
            triggerHaptic.selection();
            setViewMode('Category');
          }}
        >
          <Ionicons
            name="grid-outline"
            size={14}
            color={viewMode === 'Category' ? '#FFFFFF' : Theme.colors.textDark}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.viewModeText, viewMode === 'Category' && styles.viewModeTextActive]}>
            By Category
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'ByCake' && styles.viewModeBtnActive]}
          onPress={() => {
            triggerHaptic.selection();
            setViewMode('ByCake');
          }}
        >
          <Ionicons
            name="gift-outline"
            size={14}
            color={viewMode === 'ByCake' ? '#FFFFFF' : Theme.colors.textDark}
            style={{ marginRight: 5 }}
          />
          <Text style={[styles.viewModeText, viewMode === 'ByCake' && styles.viewModeTextActive]}>
            By Cake Commission
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dynamic Filter Row: Category Tabs or Cake Horizontal Scroller */}
      {viewMode === 'Category' ? (
        <View style={styles.categoryRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              const pendingCount = cat === 'All'
                ? requirements.filter((r) => !r.isCompleted).length
                : requirements.filter((r) => r.category === cat && !r.isCompleted).length;

              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catTab, isSelected && styles.catTabActive]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setSelectedCategory(cat);
                  }}
                >
                  <Ionicons
                    name={getCategoryIcon(cat)}
                    size={14}
                    color={isSelected ? '#FFFFFF' : Theme.colors.textDark}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.catTabText, isSelected && styles.catTabTextActive]}>
                    {cat}
                  </Text>
                  {pendingCount > 0 && (
                    <View
                      style={[
                        styles.pendingBadge,
                        isSelected ? styles.pendingBadgeActive : styles.pendingBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pendingBadgeText,
                          isSelected && { color: Theme.colors.deepRose },
                        ]}
                      >
                        {pendingCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : (
        <View style={styles.categoryRowWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {/* "All Cakes" Option */}
            <TouchableOpacity
              style={[styles.cakeTab, selectedCakeOrderId === 'All' && styles.cakeTabActive]}
              onPress={() => {
                triggerHaptic.selection();
                setSelectedCakeOrderId('All');
              }}
            >
              <Ionicons
                name="albums-outline"
                size={13}
                color={selectedCakeOrderId === 'All' ? '#FFFFFF' : Theme.colors.deepRose}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.cakeTabText,
                  selectedCakeOrderId === 'All' && styles.cakeTabTextActive,
                ]}
              >
                All Cakes ({requirements.filter((r) => !r.isCompleted).length})
              </Text>
            </TouchableOpacity>

            {cakeOptions.map((item) => {
              const isSelected = selectedCakeOrderId === item.orderId;
              const deadline = getDeadlineTag(item.deliveryDate);

              return (
                <TouchableOpacity
                  key={item.orderId}
                  style={[styles.cakeTab, isSelected && styles.cakeTabActive]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setSelectedCakeOrderId(item.orderId);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                      name={item.orderId === 'general' ? 'cube-outline' : 'gift'}
                      size={13}
                      color={isSelected ? '#FFFFFF' : Theme.colors.deepRose}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.cakeTabText,
                        isSelected && styles.cakeTabTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.customerName}
                    </Text>
                  </View>

                  {/* Deadline Tag directly in Cake Filter Tab */}
                  {deadline && (
                    <View
                      style={[
                        styles.inlineDeadlineTag,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : deadline.bgColor },
                      ]}
                    >
                      <Ionicons
                        name="alarm"
                        size={10}
                        color={isSelected ? '#FFFFFF' : deadline.color}
                        style={{ marginRight: 2 }}
                      />
                      <Text
                        style={[
                          styles.inlineDeadlineTagText,
                          { color: isSelected ? '#FFFFFF' : deadline.color },
                        ]}
                      >
                        {deadline.label}
                      </Text>
                    </View>
                  )}

                  {item.pendingCount > 0 && (
                    <View
                      style={[
                        styles.pendingBadge,
                        isSelected ? styles.pendingBadgeActive : styles.pendingBadgeInactive,
                        { marginLeft: 4 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pendingBadgeText,
                          isSelected && { color: Theme.colors.deepRose },
                        ]}
                      >
                        {item.pendingCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quick Add Bar for To-Do item */}
      <View style={styles.inputContainer}>
        <Ionicons
          name={getCategoryIcon(selectedCategory)}
          size={18}
          color={Theme.colors.deepRose}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.textInput}
          placeholder={
            selectedCategory === 'All'
              ? 'Add new requirement (defaults to Add-ons)...'
              : `Add new ${selectedCategory === 'Add-ons' ? 'Add-on requirement' : selectedCategory.toLowerCase()}...`
          }
          placeholderTextColor={Theme.colors.textSecondary}
          value={newTitle}
          onChangeText={setNewTitle}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        {newTitle.trim().length > 0 && (
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
            <Ionicons name="arrow-up-circle" size={26} color={Theme.colors.deepRose} />
          </TouchableOpacity>
        )}
      </View>

      {/* Sub-header with To-Do Progress Count */}
      <View style={styles.statusSubHeader}>
        <Text style={styles.progressText}>
          {uncompleted.length} to do • {completed.length} completed
        </Text>
        {completed.length > 0 && (
          <TouchableOpacity
            onPress={() => onClearCompleted(selectedCategory === 'All' ? undefined : selectedCategory)}
          >
            <Text style={styles.clearDoneText}>Clear done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Interactive To-Do List */}
      <FlatList
        data={sortedItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={selectedCategory === 'All' ? 'No To-Dos' : `No ${selectedCategory} To-Dos`}
            subtitle={
              selectedCategory === 'All'
                ? 'All bakery requirements and commission add-ons are prepped and completed!'
                : `All ${selectedCategory.toLowerCase()} items for commissions are prepped and completed!`
            }
          />
        }
        renderItem={({ item }) => {
          // Look up corresponding order if item is linked
          const linkedOrder = item.orderId ? orderMap.get(item.orderId) : undefined;
          const deadline = linkedOrder ? getDeadlineTag(linkedOrder.deliveryDate) : null;

          return (
            <View style={[styles.row, item.isCompleted && styles.rowCompleted]}>
              <TouchableOpacity
                style={styles.checkboxTouch}
                onPress={() => handleItemPress(item)}
              >
                <View
                  style={[
                    styles.checkbox,
                    item.isCompleted ? styles.checkboxChecked : styles.checkboxUnchecked,
                  ]}
                >
                  {item.isCompleted && (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.itemTitle,
                    item.isCompleted && styles.itemTitleCompleted,
                  ]}
                  onPress={() => handleItemPress(item)}
                >
                  {item.title}
                </Text>

                <View style={styles.tagRow}>
                  {/* Category Pill */}
                  <View style={styles.addonTag}>
                    <Ionicons
                      name={getCategoryIcon(item.category)}
                      size={10}
                      color={Theme.colors.deepRose}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={styles.addonTagText}>{item.category}</Text>
                  </View>

                  {/* Linked Cake Order Pill */}
                  {linkedOrder && (
                    <View style={styles.cakeTag}>
                      <Ionicons
                        name="gift-outline"
                        size={10}
                        color={Theme.colors.softLilac}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={styles.cakeTagText} numberOfLines={1}>
                        {linkedOrder.customerName}
                      </Text>
                    </View>
                  )}

                  {/* Deadline Urgency Tag (e.g. 15 min, 30 min, 1 hour, 3 hour, 6 hour, 12 hour, 24 hour, 48 hour) */}
                  {deadline && (
                    <View
                      style={[
                        styles.deadlineBadge,
                        { backgroundColor: deadline.bgColor },
                      ]}
                    >
                      <Ionicons
                        name="alarm"
                        size={10}
                        color={deadline.color}
                        style={{ marginRight: 2 }}
                      />
                      <Text
                        style={[
                          styles.deadlineBadgeText,
                          { color: deadline.color },
                        ]}
                      >
                        {deadline.label}
                      </Text>
                    </View>
                  )}

                  {/* Completed Expense Badge */}
                  {item.isCompleted && typeof item.expenseAmount === 'number' && item.expenseAmount > 0 && (
                    <View style={styles.expenseBadge}>
                      <Ionicons name="cash-outline" size={10} color="#D97706" style={{ marginRight: 2 }} />
                      <Text style={styles.expenseBadgeText}>${item.expenseAmount.toFixed(2)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic.light();
                  onDeleteRequirement(item.id);
                }}
                style={styles.deleteBtn}
              >
                <Ionicons name="trash-outline" size={16} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Record Expense Modal on Requirement Completion */}
      <Modal
        visible={!!pendingCompleteItem}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingCompleteItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.expenseModalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="receipt-outline" size={28} color={Theme.colors.deepRose} />
            </View>

            <Text style={styles.modalTitle}>Record Expense?</Text>
            <Text style={styles.modalSub}>
              Did you pay for <Text style={{ fontWeight: '700', color: Theme.colors.textDark }}>{pendingCompleteItem?.title}</Text>? Enter the cost to log it as an expense.
            </Text>

            <View style={styles.amountInputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.amountInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Theme.colors.textSecondary}
                value={expenseInput}
                onChangeText={setExpenseInput}
                onSubmitEditing={() => confirmCompletionWithExpense(true)}
                returnKeyType="done"
                autoFocus
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => confirmCompletionWithExpense(false)}
              >
                <Text style={styles.skipBtnText}>No Expense ($0)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  !expenseInput.trim() && { opacity: 0.6 },
                ]}
                onPress={() => confirmCompletionWithExpense(true)}
              >
                <Text style={styles.confirmBtnText}>Save Expense</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.button,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  viewModeBtnActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  viewModeTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  categoryRowWrapper: {
    paddingVertical: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  catTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.button,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  catTabActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  catTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  catTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  cakeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.button,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cakeTabActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  cakeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
    maxWidth: 120,
  },
  cakeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  inlineDeadlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  inlineDeadlineTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cakeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.lavenderLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cakeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.softLilac,
    maxWidth: 110,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deadlineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  pendingBadge: {
    marginLeft: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  pendingBadgeInactive: {
    backgroundColor: Theme.colors.blushPink,
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.input,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  addBtn: {
    marginLeft: 6,
  },
  statusSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 4,
  },
  progressText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  clearDoneText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  rowCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderColor: 'transparent',
  },
  checkboxTouch: {
    paddingRight: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 2,
    borderColor: Theme.colors.pastelRose,
  },
  checkboxChecked: {
    backgroundColor: Theme.colors.status.deliveredDark,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  itemTitleCompleted: {
    color: Theme.colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addonTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addonTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.deepRose,
  },
  expenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  expenseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  deleteBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  expenseModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Theme.colors.white,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Theme.colors.blushPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.cream,
    borderRadius: Theme.borderRadius.input,
    borderWidth: 1.5,
    borderColor: Theme.colors.pastelRose,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 20,
  },
  dollarSign: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.deepRose,
    marginRight: 6,
  },
  amountInput: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textDark,
    minWidth: 80,
    textAlign: 'left',
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.button,
    backgroundColor: Theme.colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  confirmBtn: {
    flex: 1.3,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.button,
    backgroundColor: Theme.colors.deepRose,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
