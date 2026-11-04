import React, { useState } from 'react';
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
import { GeneralRequirement, RequirementCategory } from '../types';
import { Theme } from '../theme';
import { EmptyState } from '../components/EmptyState';
import { triggerHaptic } from '../services/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterCategory = RequirementCategory | 'All';

interface BusinessNeedsScreenProps {
  requirements: GeneralRequirement[];
  onToggleRequirement: (id: string, expenseAmount?: number) => void;
  onAddRequirement: (title: string, category: RequirementCategory) => void;
  onDeleteRequirement: (id: string) => void;
  onClearCompleted: (category?: RequirementCategory) => void;
}

export const BusinessNeedsScreen: React.FC<BusinessNeedsScreenProps> = ({
  requirements,
  onToggleRequirement,
  onAddRequirement,
  onDeleteRequirement,
  onClearCompleted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('All');
  const [newTitle, setNewTitle] = useState('');

  // Expense modal state when marking an item as completed
  const [pendingCompleteItem, setPendingCompleteItem] = useState<GeneralRequirement | null>(null);
  const [expenseInput, setExpenseInput] = useState('');

  // Strict per-item segregation or all items:
  const categoryItems = selectedCategory === 'All'
    ? requirements
    : requirements.filter((r) => r.category === selectedCategory);
  const uncompleted = categoryItems.filter((r) => !r.isCompleted);
  const completed = categoryItems.filter((r) => r.isCompleted);
  const sortedItems = [...uncompleted, ...completed];

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    triggerHaptic.light();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const targetCat: RequirementCategory = selectedCategory === 'All' ? 'Add-ons' : selectedCategory;
    onAddRequirement(newTitle.trim(), targetCat);
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
      {/* Scrollable Category Tabs with "All" first */}
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
        renderItem={({ item }) => (
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
                <View style={styles.addonTag}>
                  <Ionicons
                    name={getCategoryIcon(item.category)}
                    size={10}
                    color={Theme.colors.deepRose}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={styles.addonTagText}>{item.category}</Text>
                </View>

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
        )}
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
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  catTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  pendingBadge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  pendingBadgeActive: {
    backgroundColor: '#FFFFFF',
  },
  pendingBadgeInactive: {
    backgroundColor: Theme.colors.blushPink,
  },
  pendingBadgeText: {
    fontSize: 10,
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
    width: 22,
    height: 22,
    borderRadius: 11,
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
    fontSize: 14,
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
    gap: 6,
    marginTop: 3,
  },
  addonTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addonTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.deepRose,
  },
  expenseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  expenseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  deleteBtn: {
    padding: 4,
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
