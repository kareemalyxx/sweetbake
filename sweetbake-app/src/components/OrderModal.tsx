import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CakeOrder, OrderStatus, FulfillmentType, ReminderTiming, OrderExpense } from '../types';
import { Theme } from '../theme';
import { CAKE_TYPES, CAKE_SHAPES, CAKE_FLAVORS, CAKE_ADDONS } from '../constants';
import { COUNTRY_CODES, parsePhoneCountry, CountryCodeItem } from '../constants/countryCodes';
import { StorageService } from '../services/storage';
import { NotificationService } from '../services/notifications';
import { triggerHaptic } from '../services/haptics';

interface OrderModalProps {
  visible: boolean;
  orderToEdit?: CakeOrder | null;
  initialDate?: Date;
  onClose: () => void;
  onSave: (order: Partial<CakeOrder>) => void;
}

const REMINDER_OPTIONS: { label: string; value: ReminderTiming }[] = [
  { label: 'At event time', value: 'on_time' },
  { label: '15 min before', value: '15_min' },
  { label: '1 hour before', value: '1_hour' },
  { label: '2 hours before', value: '2_hours' },
  { label: '1 day before', value: '1_day' },
];

export const OrderModal: React.FC<OrderModalProps> = ({
  visible,
  orderToEdit,
  initialDate,
  onClose,
  onSave,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [cakeType, setCakeType] = useState(CAKE_TYPES[0]);
  const [shape, setShape] = useState(CAKE_SHAPES[0]);
  const [flavor, setFlavor] = useState(CAKE_FLAVORS[0]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [status, setStatus] = useState<OrderStatus>('Pending');

  // Fulfillment & Location
  const [fulfillmentType, setFulfillmentType] = useState<FulfillmentType>('Pickup');
  const [location, setLocation] = useState('');

  // Financials
  const [totalPaymentStr, setTotalPaymentStr] = useState('85');
  const [downPaymentStr, setDownPaymentStr] = useState('0');

  // Expenses
  const [expenses, setExpenses] = useState<OrderExpense[]>([]);
  const [expenseAmountStr, setExpenseAmountStr] = useState('');
  const [expenseNotes, setExpenseNotes] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);

  // Reminders (support multiple notification timings & custom specific dates)
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimings, setReminderTimings] = useState<ReminderTiming[]>(['1_hour']);
  const [customReminderDates, setCustomReminderDates] = useState<string[]>([]);

  // Custom date/time picker state for reminders
  const [customReminderPickerDate, setCustomReminderPickerDate] = useState<Date>(new Date());
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false);

  const [customRequirements, setCustomRequirements] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  // Native Date & Time objects
  const [deliveryDate, setDeliveryDate] = useState<Date>(
    initialDate || new Date(Date.now() + 3 * 24 * 3600 * 1000)
  );

  // Pop-up picker controllers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Delivery specific fields
  const [deliveryCostStr, setDeliveryCostStr] = useState('');
  const [deliveryPerson, setDeliveryPerson] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryHandoverDate, setDeliveryHandoverDate] = useState<Date | null>(null);
  const [showHandoverDatePicker, setShowHandoverDatePicker] = useState(false);
  const [showHandoverTimePicker, setShowHandoverTimePicker] = useState(false);

  // Dynamic customization lists
  const [availableFlavors, setAvailableFlavors] = useState<string[]>(CAKE_FLAVORS);
  const [availableCakeTypes, setAvailableCakeTypes] = useState<string[]>(CAKE_TYPES);
  const [availableShapes, setAvailableShapes] = useState<string[]>(CAKE_SHAPES);
  const [availableAddons, setAvailableAddons] = useState<string[]>(CAKE_ADDONS);

  // Client Phone Number (for WhatsApp notification)
  const [customerDialCode, setCustomerDialCode] = useState('+20');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // Add new item prompt states
  const [newFlavorInput, setNewFlavorInput] = useState('');
  const [showAddFlavor, setShowAddFlavor] = useState(false);

  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  const [newShapeInput, setNewShapeInput] = useState('');
  const [showAddShape, setShowAddShape] = useState(false);

  const [newAddonInput, setNewAddonInput] = useState('');
  const [showAddAddon, setShowAddAddon] = useState(false);

  // Rename modal states
  const [renameTarget, setRenameTarget] = useState<{
    category: 'Type' | 'Shape' | 'Flavor' | 'Add-on';
    oldValue: string;
  } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  useEffect(() => {
    const loadDynamicOptions = async () => {
      const storedFlavors = await StorageService.getFlavors(CAKE_FLAVORS);
      const storedTypes = await StorageService.getCakeTypes(CAKE_TYPES);
      const storedShapes = await StorageService.getCakeShapes(CAKE_SHAPES);
      const storedAddons = await StorageService.getCakeAddons(CAKE_ADDONS);
      setAvailableFlavors(storedFlavors);
      setAvailableCakeTypes(storedTypes);
      setAvailableShapes(storedShapes);
      setAvailableAddons(storedAddons);
    };
    loadDynamicOptions();
  }, []);

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName);
      const parsed = parsePhoneCountry(orderToEdit.customerPhone);
      setCustomerDialCode(parsed.dialCode);
      setCustomerPhone(parsed.nationalNumber);
      setCakeType(orderToEdit.cakeType);
      setShape(orderToEdit.shape);
      setFlavor(orderToEdit.flavor);
      setStatus(orderToEdit.status);
      // Convert addons to string[] array format
      if (Array.isArray(orderToEdit.addons)) {
        setSelectedAddons(orderToEdit.addons);
      } else if (orderToEdit.addons && typeof orderToEdit.addons === 'object') {
        setSelectedAddons(Object.keys(orderToEdit.addons));
      } else {
        setSelectedAddons([]);
      }
      setTotalPaymentStr(String(orderToEdit.quotedPrice ?? 85));
      setDownPaymentStr(String(orderToEdit.downPayment ?? 0));
      setExpenses(orderToEdit.expenses || []);
      setFulfillmentType(orderToEdit.fulfillmentType || 'Pickup');
      setLocation(orderToEdit.location || '');
      setDeliveryCostStr(orderToEdit.deliveryCost !== undefined ? String(orderToEdit.deliveryCost) : '');
      setDeliveryPerson(orderToEdit.deliveryPerson || '');
      setDeliveryPhone(orderToEdit.deliveryPhone || '');
      setDeliveryHandoverDate(orderToEdit.deliveryHandoverTime ? new Date(orderToEdit.deliveryHandoverTime) : null);
      setReminderEnabled(Boolean(orderToEdit.reminderEnabled));
      const editTimings = orderToEdit.reminders?.reminderTimings || orderToEdit.reminderTimings;
      if (Array.isArray(editTimings) && editTimings.length > 0) {
        setReminderTimings(editTimings);
      } else {
        setReminderTimings(['1_hour']);
      }
      const editCustomDates = orderToEdit.reminders?.customReminderDates || orderToEdit.customReminderDates;
      setCustomReminderDates(
        Array.isArray(editCustomDates) ? editCustomDates : []
      );
      setCustomRequirements(orderToEdit.customRequirements || '');
      setReferenceImages(orderToEdit.referenceImages || []);
      setDeliveryDate(new Date(orderToEdit.deliveryDate));
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCakeType(availableCakeTypes[0] || CAKE_TYPES[0]);
      setShape(availableShapes[0] || CAKE_SHAPES[0]);
      setFlavor(availableFlavors[0] || CAKE_FLAVORS[0]);
      setStatus('Pending');
      setSelectedAddons([]);
      setTotalPaymentStr('85');
      setDownPaymentStr('0');
      setExpenses([]);
      setExpenseAmountStr('');
      setExpenseNotes('');
      setShowAddExpense(false);
      setFulfillmentType('Pickup');
      setLocation('');
      setDeliveryCostStr('');
      setDeliveryPerson('');
      setDeliveryPhone('');
      setDeliveryHandoverDate(null);
      setReminderEnabled(false);
      setReminderTimings(['1_hour']);
      setCustomReminderDates([]);
      setCustomRequirements('');
      setReferenceImages([]);

      const target = initialDate || new Date(Date.now() + 3 * 24 * 3600 * 1000);
      target.setHours(14, 0, 0, 0);
      setDeliveryDate(target);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
    setShowCustomDatePicker(false);
    setShowCustomTimePicker(false);
    setShowHandoverDatePicker(false);
    setShowHandoverTimePicker(false);
  }, [orderToEdit, initialDate, visible]);

  // Calculated remaining payment & profit after expenses
  const totalVal = Math.max(0, parseFloat(totalPaymentStr) || 0);
  const downVal = Math.max(0, parseFloat(downPaymentStr) || 0);
  const remainingVal = Math.max(0, totalVal - downVal);
  const totalExpensesVal = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const estimatedProfitVal = totalVal - totalExpensesVal;

  // Handle Handover Date change
  const onHandoverDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowHandoverDatePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const current = deliveryHandoverDate || new Date(deliveryDate.getTime() - 2 * 3600000);
      const updated = new Date(current);
      updated.setFullYear(selected.getFullYear());
      updated.setMonth(selected.getMonth());
      updated.setDate(selected.getDate());
      setDeliveryHandoverDate(updated);
    }
  };

  // Handle Handover Time change
  const onHandoverTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowHandoverTimePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const current = deliveryHandoverDate || new Date(deliveryDate.getTime() - 2 * 3600000);
      const updated = new Date(current);
      updated.setHours(selected.getHours());
      updated.setMinutes(selected.getMinutes());
      setDeliveryHandoverDate(updated);
    }
  };

  // Handle native Date change
  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const updated = new Date(deliveryDate);
      updated.setFullYear(selected.getFullYear());
      updated.setMonth(selected.getMonth());
      updated.setDate(selected.getDate());
      setDeliveryDate(updated);
    }
  };

  // Handle native Time change
  const onTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const updated = new Date(deliveryDate);
      updated.setHours(selected.getHours());
      updated.setMinutes(selected.getMinutes());
      setDeliveryDate(updated);
    }
  };

  // Handle custom reminder Date change
  const onCustomDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowCustomDatePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const updated = new Date(customReminderPickerDate);
      updated.setFullYear(selected.getFullYear());
      updated.setMonth(selected.getMonth());
      updated.setDate(selected.getDate());
      setCustomReminderPickerDate(updated);
    }
  };

  // Handle custom reminder Time change
  const onCustomTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowCustomTimePicker(false);
    }
    if (selected) {
      triggerHaptic.selection();
      const updated = new Date(customReminderPickerDate);
      updated.setHours(selected.getHours());
      updated.setMinutes(selected.getMinutes());
      setCustomReminderPickerDate(updated);
    }
  };

  const handleAddCustomReminder = () => {
    triggerHaptic.success();
    const isoString = customReminderPickerDate.toISOString();
    if (!customReminderDates.includes(isoString)) {
      setCustomReminderDates([...customReminderDates, isoString]);
    }
    setShowCustomDatePicker(false);
    setShowCustomTimePicker(false);
  };

  const handleRemoveCustomReminder = (iso: string) => {
    triggerHaptic.light();
    setCustomReminderDates(customReminderDates.filter((d) => d !== iso));
  };

  const handleAddNewFlavor = async () => {
    const trimmed = newFlavorInput.trim();
    if (!trimmed) return;
    if (availableFlavors.includes(trimmed)) {
      setFlavor(trimmed);
      setNewFlavorInput('');
      setShowAddFlavor(false);
      return;
    }
    triggerHaptic.success();
    const updated = [...availableFlavors, trimmed];
    setAvailableFlavors(updated);
    setFlavor(trimmed);
    setNewFlavorInput('');
    setShowAddFlavor(false);
    await StorageService.saveFlavors(updated);
  };

  const handleAddNewType = async () => {
    const trimmed = newTypeInput.trim();
    if (!trimmed) return;
    if (availableCakeTypes.includes(trimmed)) {
      setCakeType(trimmed);
      setNewTypeInput('');
      setShowAddType(false);
      return;
    }
    triggerHaptic.success();
    const updated = [...availableCakeTypes, trimmed];
    setAvailableCakeTypes(updated);
    setCakeType(trimmed);
    setNewTypeInput('');
    setShowAddType(false);
    await StorageService.saveCakeTypes(updated);
  };

  const handleAddNewShape = async () => {
    const trimmed = newShapeInput.trim();
    if (!trimmed) return;
    if (availableShapes.includes(trimmed)) {
      setShape(trimmed);
      setNewShapeInput('');
      setShowAddShape(false);
      return;
    }
    triggerHaptic.success();
    const updated = [...availableShapes, trimmed];
    setAvailableShapes(updated);
    setShape(trimmed);
    setNewShapeInput('');
    setShowAddShape(false);
    await StorageService.saveCakeShapes(updated);
  };

  const handleAddNewAddon = async () => {
    const trimmed = newAddonInput.trim();
    if (!trimmed) return;
    if (availableAddons.includes(trimmed)) {
      if (!selectedAddons.includes(trimmed)) {
        setSelectedAddons([...selectedAddons, trimmed]);
      }
      setNewAddonInput('');
      setShowAddAddon(false);
      return;
    }
    triggerHaptic.success();
    const updated = [...availableAddons, trimmed];
    setAvailableAddons(updated);
    setSelectedAddons([...selectedAddons, trimmed]);
    setNewAddonInput('');
    setShowAddAddon(false);
    await StorageService.saveCakeAddons(updated);
  };

  const toggleAddon = (addon: string) => {
    triggerHaptic.selection();
    if (selectedAddons.includes(addon)) {
      setSelectedAddons(selectedAddons.filter((a) => a !== addon));
    } else {
      setSelectedAddons([...selectedAddons, addon]);
    }
  };

  // Open Rename dialog on long press
  const openRenameModal = (category: 'Type' | 'Shape' | 'Flavor' | 'Add-on', value: string) => {
    triggerHaptic.heavy();
    setRenameTarget({ category, oldValue: value });
    setRenameInputValue(value);
  };

  // Confirm Rename action
  const confirmRename = async () => {
    if (!renameTarget) return;
    const newVal = renameInputValue.trim();
    if (!newVal || newVal === renameTarget.oldValue) {
      setRenameTarget(null);
      return;
    }

    const { category, oldValue } = renameTarget;
    triggerHaptic.success();

    if (category === 'Flavor') {
      const updated = availableFlavors.map((f) => (f === oldValue ? newVal : f));
      setAvailableFlavors(updated);
      if (flavor === oldValue) setFlavor(newVal);
      await StorageService.saveFlavors(updated);
    } else if (category === 'Type') {
      const updated = availableCakeTypes.map((t) => (t === oldValue ? newVal : t));
      setAvailableCakeTypes(updated);
      if (cakeType === oldValue) setCakeType(newVal);
      await StorageService.saveCakeTypes(updated);
    } else if (category === 'Shape') {
      const updated = availableShapes.map((s) => (s === oldValue ? newVal : s));
      setAvailableShapes(updated);
      if (shape === oldValue) setShape(newVal);
      await StorageService.saveCakeShapes(updated);
    } else if (category === 'Add-on') {
      const updated = availableAddons.map((a) => (a === oldValue ? newVal : a));
      setAvailableAddons(updated);
      if (selectedAddons.includes(oldValue)) {
        setSelectedAddons(selectedAddons.map((a) => (a === oldValue ? newVal : a)));
      }
      await StorageService.saveCakeAddons(updated);
    }

    setRenameTarget(null);
  };

  const pickImages = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please allow photo gallery access to attach cake inspiration photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map((asset) => asset.uri);
        triggerHaptic.success();
        setReferenceImages((prev) => [...prev, ...uris]);
      }
    } catch {
      Alert.alert('Error', 'Unable to pick images.');
    }
  };

  const removeImage = (index: number) => {
    triggerHaptic.light();
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddExpense = () => {
    const amt = parseFloat(expenseAmountStr);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }
    triggerHaptic.success();
    const newExpense: OrderExpense = {
      id: `exp-${Date.now()}`,
      amount: amt,
      notes: expenseNotes.trim() || 'Supplies / Ingredients',
      date: new Date().toISOString(),
    };
    setExpenses([...expenses, newExpense]);
    setExpenseAmountStr('');
    setExpenseNotes('');
    setShowAddExpense(false);
  };

  const handleRemoveExpense = (id: string) => {
    triggerHaptic.light();
    setExpenses(expenses.filter((e) => e.id !== id));
  };

  const handleSave = () => {
    if (!customerName.trim()) {
      Alert.alert('Customer Name Required', 'Please enter the client or customer name.');
      return;
    }

    const fullPhone = customerPhone.trim() ? `${customerDialCode}${customerPhone.trim().replace(/^0+/, '')}` : '';

    // Calculate trigger times map: label -> trigger ISO string
    const remindersMap: Record<string, string> = {};
    if (reminderEnabled) {
      const deliveryMs = deliveryDate.getTime();
      const offsetMap: Record<ReminderTiming, number> = {
        '15_min': 15 * 60 * 1000,
        '1_hour': 60 * 60 * 1000,
        '2_hours': 2 * 60 * 60 * 1000,
        '1_day': 24 * 60 * 60 * 1000,
        'on_time': 0,
      };

      reminderTimings.forEach((timing) => {
        const triggerDate = new Date(deliveryMs - (offsetMap[timing] ?? 0));
        remindersMap[timing] = triggerDate.toISOString();
      });

      customReminderDates.forEach((iso, idx) => {
        const d = new Date(iso);
        if (!isNaN(d.getTime())) {
          remindersMap[`Custom Alert ${idx + 1}`] = d.toISOString();
        }
      });
    }

    triggerHaptic.success();
    onSave({
      id: orderToEdit ? orderToEdit.id : undefined,
      customerName: customerName.trim(),
      customerPhone: fullPhone,
      cakeType,
      shape,
      flavor,
      addons: selectedAddons,
      status,
      quotedPrice: totalVal,
      downPayment: downVal,
      remainingPayment: remainingVal,
      expenses,
      fulfillmentType,
      location: location.trim(),
      deliveryCost: fulfillmentType === 'Delivery' && deliveryCostStr ? Math.max(0, parseFloat(deliveryCostStr) || 0) : undefined,
      deliveryPerson: fulfillmentType === 'Delivery' ? deliveryPerson.trim() || undefined : undefined,
      deliveryPhone: fulfillmentType === 'Delivery' ? deliveryPhone.trim() || undefined : undefined,
      deliveryHandoverTime: fulfillmentType === 'Delivery' && deliveryHandoverDate ? deliveryHandoverDate.toISOString() : undefined,
      reminderEnabled,
      reminders: remindersMap,
      reminderTimings: reminderEnabled ? reminderTimings : [],
      customReminderDates: reminderEnabled ? customReminderDates : [],
      customRequirements: customRequirements.trim(),
      deliveryDate: deliveryDate.toISOString(),
      referenceImages,
    });
    onClose();
  };

  // Formatted date and time strings
  const formattedDateStr = deliveryDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTimeStr = deliveryDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {orderToEdit ? 'Edit Cake Order' : 'New Cake Commission'}
            </Text>
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Section 1: Customer Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Client Details</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer Full Name (e.g. Sophia Miller)"
                placeholderTextColor={Theme.colors.textSecondary}
                value={customerName}
                onChangeText={setCustomerName}
              />

              <View style={styles.phoneInputRow}>
                <Ionicons name="logo-whatsapp" size={18} color="#25D366" style={{ marginRight: 6 }} />
                
                {/* Country Code Picker Trigger */}
                <TouchableOpacity
                  style={styles.countryCodePickerBtn}
                  onPress={() => {
                    triggerHaptic.selection();
                    setCountrySearch('');
                    setShowCountryPicker(true);
                  }}
                >
                  <Text style={styles.countryCodeFlag}>
                    {COUNTRY_CODES.find((c) => c.dialCode === customerDialCode)?.flag || '🌐'}
                  </Text>
                  <Text style={styles.countryCodeText}>{customerDialCode}</Text>
                  <Ionicons name="chevron-down" size={12} color={Theme.colors.textSecondary} style={{ marginLeft: 2 }} />
                </TouchableOpacity>

                <View style={styles.phoneDivider} />

                <TextInput
                  style={styles.phoneInput}
                  placeholder="WhatsApp number (e.g. 1012345678)"
                  placeholderTextColor={Theme.colors.textSecondary}
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                />
              </View>
            </View>

            {/* Section 2: Fulfillment & Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fulfillment Method & Location</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    fulfillmentType === 'Pickup' && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setFulfillmentType('Pickup');
                  }}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={16}
                    color={fulfillmentType === 'Pickup' ? '#FFFFFF' : Theme.colors.textDark}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      fulfillmentType === 'Pickup' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Bakery Pick Up
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentBtn,
                    fulfillmentType === 'Delivery' && styles.segmentBtnActive,
                  ]}
                  onPress={() => {
                    triggerHaptic.selection();
                    setFulfillmentType('Delivery');
                  }}
                >
                  <Ionicons
                    name="car-outline"
                    size={16}
                    color={fulfillmentType === 'Delivery' ? '#FFFFFF' : Theme.colors.textDark}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.segmentBtnText,
                      fulfillmentType === 'Delivery' && styles.segmentBtnTextActive,
                    ]}
                  >
                    Direct Delivery
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>
                {fulfillmentType === 'Delivery' ? 'Delivery Address / Venue' : 'Pickup Location / Counter Notes'}
              </Text>
              <View style={styles.locationInputRow}>
                <Ionicons
                  name={fulfillmentType === 'Delivery' ? 'location-outline' : 'business-outline'}
                  size={18}
                  color={Theme.colors.deepRose}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  style={styles.locationInput}
                  placeholder={
                    fulfillmentType === 'Delivery'
                      ? 'e.g. 742 Evergreen Terrace or Rosewood Ballroom'
                      : 'e.g. Main Studio front desk, or client phone'
                  }
                  placeholderTextColor={Theme.colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Delivery Logistics Details: Shown when Delivery is selected */}
              {fulfillmentType === 'Delivery' && (
                <View style={styles.deliveryDetailsCard}>
                  <View style={styles.deliveryDetailsHeader}>
                    <Ionicons name="bicycle-outline" size={18} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
                    <Text style={styles.deliveryDetailsTitle}>Courier / Delivery Dispatch Details</Text>
                  </View>

                  {/* 1. Delivery Cost */}
                  <Text style={styles.deliverySubLabel}>Delivery Fee / Cost</Text>
                  <View style={styles.deliveryInputRow}>
                    <Text style={styles.currencyPrefix}>$</Text>
                    <TextInput
                      style={styles.deliveryInput}
                      placeholder="0.00 (e.g. 15.00)"
                      placeholderTextColor={Theme.colors.textSecondary}
                      keyboardType="decimal-pad"
                      value={deliveryCostStr}
                      onChangeText={setDeliveryCostStr}
                    />
                  </View>

                  {/* 2. Delivery Person / Company */}
                  <Text style={styles.deliverySubLabel}>Delivery Person or Courier Company</Text>
                  <View style={styles.deliveryInputRow}>
                    <Ionicons name="person-outline" size={16} color={Theme.colors.deepRose} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.deliveryInput}
                      placeholder="e.g. John Doe, Uber Eats, DoorDash, Swift Courier"
                      placeholderTextColor={Theme.colors.textSecondary}
                      value={deliveryPerson}
                      onChangeText={setDeliveryPerson}
                    />
                  </View>

                  {/* 3. Driver / Company Contact Phone */}
                  <Text style={styles.deliverySubLabel}>Driver / Courier Phone Number</Text>
                  <View style={styles.deliveryInputRow}>
                    <Ionicons name="call-outline" size={16} color="#25D366" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.deliveryInput}
                      placeholder="e.g. +1 555 987 6543"
                      placeholderTextColor={Theme.colors.textSecondary}
                      keyboardType="phone-pad"
                      value={deliveryPhone}
                      onChangeText={setDeliveryPhone}
                    />
                  </View>

                  {/* 4. When to hand over the cake to driver (Handover Schedule) */}
                  <Text style={styles.deliverySubLabel}>When to Give Him/Her the Cake (Handover Time)</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    {/* Handover Date */}
                    <TouchableOpacity
                      style={[styles.handoverPickerBtn, showHandoverDatePicker && styles.handoverPickerBtnActive]}
                      onPress={() => {
                        triggerHaptic.selection();
                        if (!deliveryHandoverDate) {
                          const defaultHandover = new Date(deliveryDate.getTime() - 2 * 3600000);
                          setDeliveryHandoverDate(defaultHandover);
                        }
                        setShowHandoverDatePicker(!showHandoverDatePicker);
                        if (!showHandoverDatePicker) setShowHandoverTimePicker(false);
                      }}
                    >
                      <Ionicons name="calendar-outline" size={16} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
                      <Text style={styles.handoverPickerBtnText}>
                        {deliveryHandoverDate
                          ? deliveryHandoverDate.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Set Date'}
                      </Text>
                    </TouchableOpacity>

                    {/* Handover Time */}
                    <TouchableOpacity
                      style={[styles.handoverPickerBtn, showHandoverTimePicker && styles.handoverPickerBtnActive]}
                      onPress={() => {
                        triggerHaptic.selection();
                        if (!deliveryHandoverDate) {
                          const defaultHandover = new Date(deliveryDate.getTime() - 2 * 3600000);
                          setDeliveryHandoverDate(defaultHandover);
                        }
                        setShowHandoverTimePicker(!showHandoverTimePicker);
                        if (!showHandoverTimePicker) setShowHandoverDatePicker(false);
                      }}
                    >
                      <Ionicons name="time-outline" size={16} color={Theme.colors.softLilac} style={{ marginRight: 6 }} />
                      <Text style={styles.handoverPickerBtnText}>
                        {deliveryHandoverDate
                          ? deliveryHandoverDate.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })
                          : 'Set Time'}
                      </Text>
                    </TouchableOpacity>

                    {deliveryHandoverDate && (
                      <TouchableOpacity
                        style={styles.handoverClearBtn}
                        onPress={() => {
                          triggerHaptic.light();
                          setDeliveryHandoverDate(null);
                          setShowHandoverDatePicker(false);
                          setShowHandoverTimePicker(false);
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color={Theme.colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Inline Pickers for Handover */}
                  {showHandoverDatePicker && (
                    <View style={[styles.inlinePickerContainer, { marginTop: 8 }]}>
                      <DateTimePicker
                        value={deliveryHandoverDate || deliveryDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        onChange={onHandoverDateChange}
                        accentColor={Theme.colors.deepRose}
                        textColor={Theme.colors.textDark}
                        themeVariant="light"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.donePickerBtn}
                          onPress={() => setShowHandoverDatePicker(false)}
                        >
                          <Text style={styles.donePickerText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {showHandoverTimePicker && (
                    <View style={[styles.inlinePickerContainer, { marginTop: 8 }]}>
                      <DateTimePicker
                        value={deliveryHandoverDate || deliveryDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onHandoverTimeChange}
                        accentColor={Theme.colors.deepRose}
                        textColor={Theme.colors.textDark}
                        themeVariant="light"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity
                          style={styles.donePickerBtn}
                          onPress={() => setShowHandoverTimePicker(false)}
                        >
                          <Text style={styles.donePickerText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Section 3: Delivery Date & Time (Pop-up native Calendar & Clock Knob) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {fulfillmentType === 'Delivery' ? 'Delivery Schedule' : 'Pickup Schedule'}
              </Text>
              <Text style={styles.fieldSubtitle}>
                Tap below to open the native calendar or iPhone time dial
              </Text>

              {/* 1. Pop-up Calendar Card */}
              <TouchableOpacity
                style={[styles.pickerButton, showDatePicker && styles.pickerButtonActive]}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  setShowDatePicker(!showDatePicker);
                  if (!showDatePicker) setShowTimePicker(false);
                }}
              >
                <View style={styles.pickerIconWrapper}>
                  <Ionicons name="calendar" size={20} color={Theme.colors.deepRose} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerLabel}>Scheduled Date</Text>
                  <Text style={styles.pickerValue}>{formattedDateStr}</Text>
                </View>
                <Ionicons
                  name={showDatePicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Native Calendar Pop-up View */}
              {showDatePicker && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={deliveryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={onDateChange}
                    accentColor={Theme.colors.deepRose}
                    textColor={Theme.colors.textDark}
                    themeVariant="light"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.donePickerBtn}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.donePickerText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 2. Pop-up iPhone Clock Knob / Time Dial Card */}
              <TouchableOpacity
                style={[styles.pickerButton, showTimePicker && styles.pickerButtonActive, { marginTop: 10 }]}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic.selection();
                  setShowTimePicker(!showTimePicker);
                  if (!showTimePicker) setShowDatePicker(false);
                }}
              >
                <View style={[styles.pickerIconWrapper, { backgroundColor: Theme.colors.lavenderLight }]}>
                  <Ionicons name="time" size={20} color={Theme.colors.softLilac} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerLabel}>
                    {fulfillmentType === 'Delivery' ? 'Delivery Arrival Time' : 'Pickup / Ready Time'}
                  </Text>
                  <Text style={styles.pickerValue}>{formattedTimeStr}</Text>
                </View>
                <Ionicons
                  name={showTimePicker ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={Theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Native Clock Knob / Wheel Pop-up View */}
              {showTimePicker && (
                <View style={styles.inlinePickerContainer}>
                  <DateTimePicker
                    value={deliveryDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onTimeChange}
                    accentColor={Theme.colors.deepRose}
                    textColor={Theme.colors.textDark}
                    themeVariant="light"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={styles.donePickerBtn}
                      onPress={() => setShowTimePicker(false)}
                    >
                      <Text style={styles.donePickerText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 3. Reminder Toggle & Interval Selection (Directly below schedule) */}
              <View style={styles.reminderCard}>
                <View style={styles.reminderToggleRow}>
                  <View style={styles.reminderInfo}>
                    <Ionicons
                      name={reminderEnabled ? 'notifications' : 'notifications-outline'}
                      size={20}
                      color={reminderEnabled ? Theme.colors.deepRose : Theme.colors.textSecondary}
                      style={{ marginRight: 8 }}
                    />
                    <View>
                      <Text style={styles.reminderTitle}>Order Reminder Notification</Text>
                      <Text style={styles.reminderSubtitle}>
                        Alert me inside the app before this order is due
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={reminderEnabled}
                    onValueChange={(val) => {
                      triggerHaptic.selection();
                      setReminderEnabled(val);
                    }}
                    trackColor={{ false: Theme.colors.border, true: Theme.colors.roseGold }}
                    thumbColor={reminderEnabled ? Theme.colors.deepRose : '#FFFFFF'}
                  />
                </View>

                {reminderEnabled && (
                  <View style={styles.timingSelectBox}>
                    <Text style={styles.timingLabel}>Select Reminder Times (Choose multiple)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timingChipRow}>
                      {REMINDER_OPTIONS.map((opt) => {
                        const isChosen = reminderTimings.includes(opt.value);
                        return (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.timingChip, isChosen && styles.timingChipActive]}
                            onPress={() => {
                              triggerHaptic.selection();
                              if (isChosen) {
                                // Keep at least one chosen or allow deselect
                                const filtered = reminderTimings.filter((t) => t !== opt.value);
                                setReminderTimings(filtered.length > 0 ? filtered : [opt.value]);
                              } else {
                                setReminderTimings([...reminderTimings, opt.value]);
                              }
                            }}
                          >
                            <Ionicons
                              name={isChosen ? 'checkbox' : 'square-outline'}
                              size={14}
                              color={isChosen ? '#FFFFFF' : Theme.colors.textDark}
                              style={{ marginRight: 5 }}
                            />
                            <Text style={[styles.timingChipText, isChosen && styles.timingChipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Computed trigger times preview based on delivery date */}
                    <View style={styles.reminderSchedulePreview}>
                      <Ionicons name="time-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                      <Text style={styles.reminderScheduleText}>
                        Alerts scheduled at:{' '}
                        {reminderTimings
                          .map((t) => {
                            const offset = NotificationService.getTimingOffsetMs(t);
                            const trigger = new Date(deliveryDate.getTime() - offset);
                            return trigger.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            });
                          })
                          .join(', ')}
                      </Text>
                    </View>

                    {/* Section: Custom "Time At" Specific Alerts */}
                    <View style={{ marginTop: 14 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={styles.timingLabel}>Specific Custom Date & Time Alerts</Text>
                        <TouchableOpacity
                          style={styles.addCustomAlertBtn}
                          onPress={() => {
                            triggerHaptic.selection();
                            // Default custom picker to an hour before deliveryDate or now
                            const defaultPickerTime = new Date(deliveryDate.getTime() - 3600000);
                            setCustomReminderPickerDate(defaultPickerTime > new Date() ? defaultPickerTime : new Date());
                            setShowCustomDatePicker(true);
                            setShowCustomTimePicker(false);
                          }}
                        >
                          <Ionicons name="add-circle" size={16} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                          <Text style={styles.addCustomAlertBtnText}>Add Custom Time</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Pickers for custom date and time (using exact same method as schedule) */}
                      {(showCustomDatePicker || showCustomTimePicker) && (
                        <View style={styles.customPickerBox}>
                          <Text style={styles.customPickerHeading}>
                            Pick Custom Alert Date & Time
                          </Text>

                          {/* 1. Custom Date Picker Card */}
                          <TouchableOpacity
                            style={[styles.pickerButton, showCustomDatePicker && styles.pickerButtonActive]}
                            activeOpacity={0.8}
                            onPress={() => {
                              triggerHaptic.selection();
                              setShowCustomDatePicker(true);
                              setShowCustomTimePicker(false);
                            }}
                          >
                            <View style={styles.pickerIconWrapper}>
                              <Ionicons name="calendar" size={18} color={Theme.colors.deepRose} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pickerLabel}>Custom Alert Date</Text>
                              <Text style={styles.pickerValue}>
                                {customReminderPickerDate.toLocaleDateString(undefined, {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Text>
                            </View>
                            <Ionicons
                              name={showCustomDatePicker ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={Theme.colors.textSecondary}
                            />
                          </TouchableOpacity>

                          {showCustomDatePicker && (
                            <View style={styles.inlinePickerContainer}>
                              <DateTimePicker
                                value={customReminderPickerDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                                onChange={onCustomDateChange}
                                accentColor={Theme.colors.deepRose}
                                textColor={Theme.colors.textDark}
                                themeVariant="light"
                              />
                            </View>
                          )}

                          {/* 2. Custom Time Picker Card */}
                          <TouchableOpacity
                            style={[styles.pickerButton, showCustomTimePicker && styles.pickerButtonActive, { marginTop: 8 }]}
                            activeOpacity={0.8}
                            onPress={() => {
                              triggerHaptic.selection();
                              setShowCustomTimePicker(true);
                              setShowCustomDatePicker(false);
                            }}
                          >
                            <View style={[styles.pickerIconWrapper, { backgroundColor: Theme.colors.lavenderLight }]}>
                              <Ionicons name="time" size={18} color={Theme.colors.softLilac} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pickerLabel}>Custom Alert Time</Text>
                              <Text style={styles.pickerValue}>
                                {customReminderPickerDate.toLocaleTimeString(undefined, {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true,
                                })}
                              </Text>
                            </View>
                            <Ionicons
                              name={showCustomTimePicker ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={Theme.colors.textSecondary}
                            />
                          </TouchableOpacity>

                          {showCustomTimePicker && (
                            <View style={styles.inlinePickerContainer}>
                              <DateTimePicker
                                value={customReminderPickerDate}
                                mode="time"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onCustomTimeChange}
                                accentColor={Theme.colors.deepRose}
                                textColor={Theme.colors.textDark}
                                themeVariant="light"
                              />
                            </View>
                          )}

                          <View style={styles.customPickerActionRow}>
                            <TouchableOpacity
                              style={styles.customCancelBtn}
                              onPress={() => {
                                setShowCustomDatePicker(false);
                                setShowCustomTimePicker(false);
                              }}
                            >
                              <Text style={styles.customCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.customConfirmBtn}
                              onPress={handleAddCustomReminder}
                            >
                              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                              <Text style={styles.customConfirmText}>Save Alert Time</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* List of configured custom alerts */}
                      {customReminderDates.length > 0 ? (
                        <View style={styles.customAlertList}>
                          {customReminderDates.map((iso) => {
                            const d = new Date(iso);
                            const formatted = `${d.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })} at ${d.toLocaleTimeString(undefined, {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}`;
                            return (
                              <View key={iso} style={styles.customAlertItem}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                  <Ionicons name="alarm" size={15} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
                                  <Text style={styles.customAlertText}>{formatted}</Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => handleRemoveCustomReminder(iso)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="close-circle" size={18} color="#E53935" />
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.noCustomAlertsText}>No custom alert times added yet.</Text>
                      )}
                    </View>

                    {/* Direct WhatsApp Test / Send Option */}
                    <TouchableOpacity
                      style={styles.directWhatsAppBtn}
                      onPress={() => {
                        triggerHaptic.medium();
                        const fullPhone = customerPhone.trim()
                          ? `${customerDialCode}${customerPhone.trim().replace(/^0+/, '')}`
                          : '';
                        NotificationService.sendWhatsAppNotification({
                          customerName: customerName.trim() || 'Valued Customer',
                          customerPhone: fullPhone,
                          deliveryDate: deliveryDate.toISOString(),
                          cakeType,
                          shape,
                          flavor,
                          fulfillmentType,
                          location: location.trim(),
                          quotedPrice: totalVal,
                          remainingPayment: remainingVal,
                        });
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.directWhatsAppText}>Send Order Alert via WhatsApp Now</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Section 4: Cake Specifications (Type, Shape, Flavor) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cake Specifications</Text>
              <Text style={styles.fieldSubtitle}>
                Tip: Long press on any type, shape, or flavor to rename it
              </Text>

              {/* 1. Cake Type */}
              <View style={styles.titleWithAction}>
                <Text style={styles.fieldLabel}>Type of Cake</Text>
                <TouchableOpacity
                  onPress={() => setShowAddType(!showAddType)}
                  style={styles.inlineAddBtn}
                >
                  <Ionicons name={showAddType ? 'close-circle' : 'add-circle'} size={14} color={Theme.colors.deepRose} />
                  <Text style={styles.inlineAddText}>{showAddType ? 'Cancel' : 'Add Type'}</Text>
                </TouchableOpacity>
              </View>

              {showAddType && (
                <View style={styles.addItemBox}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="New cake type (e.g. Bento Layered Cake)..."
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={newTypeInput}
                    onChangeText={setNewTypeInput}
                  />
                  <TouchableOpacity style={styles.addItemSaveBtn} onPress={handleAddNewType}>
                    <Text style={styles.addItemSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {availableCakeTypes.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.chip, cakeType === t && styles.chipActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setCakeType(t);
                    }}
                    onLongPress={() => openRenameModal('Type', t)}
                    delayLongPress={450}
                  >
                    <Text style={[styles.chipText, cakeType === t && styles.chipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 2. Shape */}
              <View style={styles.titleWithAction}>
                <Text style={styles.fieldLabel}>Cake Shape</Text>
                <TouchableOpacity
                  onPress={() => setShowAddShape(!showAddShape)}
                  style={styles.inlineAddBtn}
                >
                  <Ionicons name={showAddShape ? 'close-circle' : 'add-circle'} size={14} color={Theme.colors.deepRose} />
                  <Text style={styles.inlineAddText}>{showAddShape ? 'Cancel' : 'Add Shape'}</Text>
                </TouchableOpacity>
              </View>

              {showAddShape && (
                <View style={styles.addItemBox}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="New shape (e.g. Oval, Star)..."
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={newShapeInput}
                    onChangeText={setNewShapeInput}
                  />
                  <TouchableOpacity style={styles.addItemSaveBtn} onPress={handleAddNewShape}>
                    <Text style={styles.addItemSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {availableShapes.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, shape === s && styles.chipActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setShape(s);
                    }}
                    onLongPress={() => openRenameModal('Shape', s)}
                    delayLongPress={450}
                  >
                    <Text style={[styles.chipText, shape === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 3. Flavor & Filling */}
              <View style={styles.titleWithAction}>
                <Text style={styles.fieldLabel}>Flavor & Filling</Text>
                <TouchableOpacity
                  onPress={() => setShowAddFlavor(!showAddFlavor)}
                  style={styles.inlineAddBtn}
                >
                  <Ionicons name={showAddFlavor ? 'close-circle' : 'add-circle'} size={14} color={Theme.colors.deepRose} />
                  <Text style={styles.inlineAddText}>{showAddFlavor ? 'Cancel' : 'Add Flavor'}</Text>
                </TouchableOpacity>
              </View>

              {showAddFlavor && (
                <View style={styles.addItemBox}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="New flavor (e.g. Coconut Passionfruit, Matcha)..."
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={newFlavorInput}
                    onChangeText={setNewFlavorInput}
                  />
                  <TouchableOpacity style={styles.addItemSaveBtn} onPress={handleAddNewFlavor}>
                    <Text style={styles.addItemSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {availableFlavors.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.chip, flavor === f && styles.chipActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setFlavor(f);
                    }}
                    onLongPress={() => openRenameModal('Flavor', f)}
                    delayLongPress={450}
                  >
                    <Text style={[styles.chipText, flavor === f && styles.chipTextActive]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 4. Multi-select Add-ons */}
              <View style={styles.titleWithAction}>
                <Text style={styles.fieldLabel}>Add-ons & Accents (Multi-select)</Text>
                <TouchableOpacity
                  onPress={() => setShowAddAddon(!showAddAddon)}
                  style={styles.inlineAddBtn}
                >
                  <Ionicons name={showAddAddon ? 'close-circle' : 'add-circle'} size={14} color={Theme.colors.deepRose} />
                  <Text style={styles.inlineAddText}>{showAddAddon ? 'Cancel' : 'Add Option'}</Text>
                </TouchableOpacity>
              </View>

              {showAddAddon && (
                <View style={styles.addItemBox}>
                  <TextInput
                    style={styles.addItemInput}
                    placeholder="New add-on (e.g. LED Lights, Sparklers)..."
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={newAddonInput}
                    onChangeText={setNewAddonInput}
                  />
                  <TouchableOpacity style={styles.addItemSaveBtn} onPress={handleAddNewAddon}>
                    <Text style={styles.addItemSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {availableAddons.map((addon) => {
                  const isSelected = selectedAddons.includes(addon);
                  return (
                    <TouchableOpacity
                      key={addon}
                      style={[styles.chip, isSelected && styles.chipMultiActive]}
                      onPress={() => toggleAddon(addon)}
                      onLongPress={() => openRenameModal('Add-on', addon)}
                      delayLongPress={450}
                    >
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={14}
                        color={isSelected ? '#FFFFFF' : Theme.colors.textSecondary}
                        style={{ marginRight: 5 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {addon}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section 5: Status, Total, Down Payment & Remaining */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status & Payments</Text>

              <Text style={styles.fieldLabel}>Order Status</Text>
              <View style={styles.statusRow}>
                {(['Pending', 'Baking', 'Decorating', 'Delivered'] as OrderStatus[]).map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.statusTab, status === s && styles.statusTabActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setStatus(s);
                    }}
                  >
                    <Text
                      style={[styles.statusTabText, status === s && styles.statusTabTextActive]}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Payments Split Box */}
              <View style={styles.paymentCard}>
                <View style={styles.paymentInputGrid}>
                  {/* Total Payment */}
                  <View style={styles.paymentInputCol}>
                    <Text style={styles.paymentFieldLabel}>Total Payment ($)</Text>
                    <View style={styles.currencyInputRow}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.currencyInput}
                        placeholder="0.00"
                        placeholderTextColor={Theme.colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={totalPaymentStr}
                        onChangeText={setTotalPaymentStr}
                      />
                    </View>
                  </View>

                  {/* Down Payment */}
                  <View style={styles.paymentInputCol}>
                    <Text style={styles.paymentFieldLabel}>Down Payment ($)</Text>
                    <View style={styles.currencyInputRow}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.currencyInput}
                        placeholder="0.00"
                        placeholderTextColor={Theme.colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={downPaymentStr}
                        onChangeText={setDownPaymentStr}
                      />
                    </View>
                  </View>
                </View>

                {/* Auto Calculated Remaining Payment */}
                <View style={styles.remainingCard}>
                  <View style={styles.remainingRow}>
                    <View style={styles.remainingInfo}>
                      <Text style={styles.remainingLabel}>Remaining Balance Due</Text>
                      <Text style={styles.remainingFormula}>
                        Total (${totalVal.toFixed(2)}) - Down (${downVal.toFixed(2)})
                      </Text>
                    </View>
                    <View style={[
                      styles.remainingPill,
                      remainingVal === 0 ? styles.remainingPillPaid : styles.remainingPillDue,
                    ]}>
                      <Ionicons
                        name={remainingVal === 0 ? 'checkmark-circle' : 'time-outline'}
                        size={14}
                        color={remainingVal === 0 ? '#2E7D32' : Theme.colors.deepRose}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[
                        styles.remainingText,
                        remainingVal === 0 ? styles.remainingTextPaid : styles.remainingTextDue,
                      ]}>
                        ${remainingVal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Net Profit Summary */}
                <View style={styles.profitSummaryCard}>
                  <View style={styles.remainingRow}>
                    <View style={styles.remainingInfo}>
                      <Text style={styles.profitLabel}>Estimated Net Profit</Text>
                      <Text style={styles.profitFormula}>
                        Total (${totalVal.toFixed(2)}) - Expenses (${totalExpensesVal.toFixed(2)})
                      </Text>
                    </View>
                    <View style={[
                      styles.profitPill,
                      estimatedProfitVal >= 0 ? styles.profitPillPositive : styles.profitPillNegative,
                    ]}>
                      <Ionicons
                        name={estimatedProfitVal >= 0 ? 'trending-up' : 'trending-down'}
                        size={14}
                        color={estimatedProfitVal >= 0 ? '#1B5E20' : '#B71C1C'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[
                        styles.profitText,
                        estimatedProfitVal >= 0 ? styles.profitTextPositive : styles.profitTextNegative,
                      ]}>
                        ${estimatedProfitVal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Order Specific Expenses Section */}
              <View style={styles.expensesCard}>
                <View style={styles.titleWithAction}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={15} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
                    <Text style={styles.expensesSectionTitle}>Order Expenses ({expenses.length})</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAddExpense(!showAddExpense)}
                    style={styles.inlineAddBtn}
                  >
                    <Ionicons name={showAddExpense ? 'close-circle' : 'add-circle'} size={14} color={Theme.colors.deepRose} />
                    <Text style={styles.inlineAddText}>{showAddExpense ? 'Cancel' : 'Add Expense'}</Text>
                  </TouchableOpacity>
                </View>

                {showAddExpense && (
                  <View style={styles.expenseFormBox}>
                    <Text style={styles.expenseInputLabel}>Amount Paid ($)</Text>
                    <View style={styles.currencyInputRow}>
                      <Text style={styles.currencySymbol}>$</Text>
                      <TextInput
                        style={styles.currencyInput}
                        placeholder="0.00"
                        placeholderTextColor={Theme.colors.textSecondary}
                        keyboardType="decimal-pad"
                        value={expenseAmountStr}
                        onChangeText={setExpenseAmountStr}
                      />
                    </View>

                    <Text style={[styles.expenseInputLabel, { marginTop: 10 }]}>Expense Notes</Text>
                    <TextInput
                      style={styles.expenseNotesInput}
                      placeholder="e.g. Fondant, Cake Board, Fresh Berries"
                      placeholderTextColor={Theme.colors.textSecondary}
                      value={expenseNotes}
                      onChangeText={setExpenseNotes}
                    />

                    <TouchableOpacity style={styles.saveExpenseBtn} onPress={handleAddExpense}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.saveExpenseBtnText}>Save Expense</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {expenses.length > 0 ? (
                  <View style={styles.expensesList}>
                    {expenses.map((exp) => (
                      <View key={exp.id} style={styles.expenseItemRow}>
                        <View style={styles.expenseItemInfo}>
                          <Text style={styles.expenseItemNotes}>{exp.notes}</Text>
                          <Text style={styles.expenseItemDate}>
                            {new Date(exp.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={styles.expenseItemRight}>
                          <Text style={styles.expenseItemAmount}>-${exp.amount.toFixed(2)}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveExpense(exp.id)}
                            style={styles.expenseRemoveBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="trash-outline" size={14} color={Theme.colors.deepRose} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyExpensesText}>No expenses logged yet for this order.</Text>
                )}
              </View>
            </View>

            {/* Section 6: Photo Attachments */}
            <View style={styles.section}>
              <View style={styles.titleWithAction}>
                <Text style={styles.sectionTitle}>Sketches & Inspo Photos</Text>
                <TouchableOpacity onPress={pickImages} style={styles.addPhotosBtn}>
                  <Ionicons name="images" size={14} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                  <Text style={styles.addPhotosText}>Attach</Text>
                </TouchableOpacity>
              </View>

              {referenceImages.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                  {referenceImages.map((uri, idx) => (
                    <View key={idx} style={styles.photoWrapper}>
                      <Image source={{ uri }} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => removeImage(idx)}
                      >
                        <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <TouchableOpacity style={styles.photoPlaceholder} onPress={pickImages}>
                  <Ionicons name="camera-outline" size={24} color={Theme.colors.softLilac} />
                  <Text style={styles.photoPlaceholderText}>Attach customer sketch or moodboard</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Section 7: Notes & Custom Requirements */}
            <View style={[styles.section, { marginBottom: 40 }]}>
              <Text style={styles.sectionTitle}>Custom Notes & Piping Text</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Message on cake, dietary restrictions, color scheme, pickup notes..."
                placeholderTextColor={Theme.colors.textSecondary}
                multiline
                numberOfLines={3}
                value={customRequirements}
                onChangeText={setCustomRequirements}
              />
            </View>
          </ScrollView>

          {/* Quick Rename Pop-up Modal */}
          {renameTarget && (
            <Modal transparent animationType="fade" visible={Boolean(renameTarget)}>
              <View style={styles.renameOverlay}>
                <View style={styles.renameCard}>
                  <Text style={styles.renameTitle}>Rename {renameTarget.category}</Text>
                  <Text style={styles.renameSubtitle}>Editing: "{renameTarget.oldValue}"</Text>

                  <TextInput
                    style={styles.renameInput}
                    value={renameInputValue}
                    onChangeText={setRenameInputValue}
                    placeholder="Enter new name"
                    autoFocus
                  />

                  <View style={styles.renameBtnRow}>
                    <TouchableOpacity
                      style={styles.renameCancelBtn}
                      onPress={() => setRenameTarget(null)}
                    >
                      <Text style={styles.renameCancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.renameSaveBtn} onPress={confirmRename}>
                      <Text style={styles.renameSaveText}>Update</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}

          {/* Country Code Picker Modal */}
          <Modal
            transparent
            animationType="slide"
            visible={showCountryPicker}
            onRequestClose={() => setShowCountryPicker(false)}
          >
            <View style={styles.countryModalOverlay}>
              <View style={styles.countryModalCard}>
                <View style={styles.countryModalHeader}>
                  <Text style={styles.countryModalTitle}>Select Country Code</Text>
                  <TouchableOpacity
                    onPress={() => setShowCountryPicker(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={24} color={Theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Search Bar for Country */}
                <View style={styles.countrySearchRow}>
                  <Ionicons name="search" size={16} color={Theme.colors.textSecondary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.countrySearchInput}
                    placeholder="Search country or dial code..."
                    placeholderTextColor={Theme.colors.textSecondary}
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    autoCorrect={false}
                  />
                  {countrySearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCountrySearch('')}>
                      <Ionicons name="close-circle" size={16} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Country List */}
                <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled">
                  {COUNTRY_CODES.filter((c) => {
                    const query = countrySearch.trim().toLowerCase();
                    if (!query) return true;
                    return (
                      c.name.toLowerCase().includes(query) ||
                      c.dialCode.includes(query) ||
                      c.code.toLowerCase().includes(query)
                    );
                  }).map((item) => {
                    const isSelected = item.dialCode === customerDialCode;
                    return (
                      <TouchableOpacity
                        key={`${item.code}-${item.dialCode}`}
                        style={[styles.countryItemRow, isSelected && styles.countryItemRowSelected]}
                        onPress={() => {
                          triggerHaptic.selection();
                          setCustomerDialCode(item.dialCode);
                          setShowCountryPicker(false);
                        }}
                      >
                        <Text style={styles.countryItemFlag}>{item.flag}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.countryItemName, isSelected && styles.countryItemNameSelected]}>
                            {item.name}
                          </Text>
                          <Text style={styles.countryItemSub}>{item.code}</Text>
                        </View>
                        <Text style={[styles.countryItemDial, isSelected && styles.countryItemDialSelected]}>
                          {item.dialCode}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={Theme.colors.deepRose}
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  headerButton: {
    padding: 6,
  },
  cancelText: {
    fontSize: 15,
    color: Theme.colors.textSecondary,
  },
  saveText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 8,
  },
  countryCodePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F4EF',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  countryCodeFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: Theme.colors.border,
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textDark,
    paddingVertical: 4,
  },
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  countryModalCard: {
    backgroundColor: Theme.colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '80%',
  },
  countryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countryModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  countrySearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  countrySearchInput: {
    flex: 1,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  countryList: {
    maxHeight: 380,
  },
  countryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE4',
  },
  countryItemRowSelected: {
    backgroundColor: '#FFF0F3',
    borderRadius: 8,
  },
  countryItemFlag: {
    fontSize: 22,
    marginRight: 12,
  },
  countryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  countryItemNameSelected: {
    color: Theme.colors.deepRose,
    fontWeight: '700',
  },
  countryItemSub: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  countryItemDial: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  countryItemDialSelected: {
    color: Theme.colors.deepRose,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: Theme.colors.white,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
  },
  segmentBtnActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  deliveryDetailsCard: {
    marginTop: 12,
    backgroundColor: Theme.colors.cream,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  deliveryDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  deliveryDetailsTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  deliverySubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  deliveryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.deepRose,
    marginRight: 6,
  },
  deliveryInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  handoverPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.white,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  handoverPickerBtnActive: {
    borderColor: Theme.colors.deepRose,
    backgroundColor: '#FFF0F3',
  },
  handoverPickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  handoverClearBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pickerButtonActive: {
    borderColor: Theme.colors.deepRose,
    backgroundColor: '#FFF8FA',
  },
  pickerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Theme.colors.blushPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginTop: 1,
  },
  inlinePickerContainer: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 10,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  donePickerBtn: {
    marginTop: 6,
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.deepRose,
  },
  donePickerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  reminderCard: {
    marginTop: 14,
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  reminderSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  timingSelectBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  timingLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  timingChipRow: {
    flexDirection: 'row',
  },
  timingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Theme.colors.cream,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
  },
  timingChipActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  timingChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  timingChipTextActive: {
    color: '#FFFFFF',
  },
  reminderSchedulePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 8,
  },
  reminderScheduleText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.deepRose,
    flex: 1,
  },
  addCustomAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  addCustomAlertBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  customPickerBox: {
    backgroundColor: Theme.colors.cream,
    borderRadius: 12,
    padding: 10,
    marginTop: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
  },
  customPickerHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
    marginBottom: 8,
  },
  customPickerActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  customCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  customCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  customConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Theme.colors.deepRose,
  },
  customConfirmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  customAlertList: {
    gap: 6,
    marginTop: 6,
  },
  customAlertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  customAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  noCustomAlertsText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  directWhatsAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  directWhatsAppText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  titleWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  addItemBox: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.roseGold,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  addItemSaveBtn: {
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Theme.colors.deepRose,
    borderColor: Theme.colors.deepRose,
  },
  chipMultiActive: {
    backgroundColor: Theme.colors.roseGold,
    borderColor: Theme.colors.roseGold,
  },
  chipText: {
    fontSize: 12,
    color: Theme.colors.textDark,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    marginBottom: 14,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  statusTabActive: {
    backgroundColor: Theme.colors.lavenderLight,
    borderColor: Theme.colors.softLilac,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  statusTabTextActive: {
    color: Theme.colors.textDark,
    fontWeight: '700',
  },
  paymentCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  paymentInputGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentInputCol: {
    flex: 1,
  },
  paymentFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cream,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  currencySymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.deepRose,
    marginRight: 4,
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  remainingCard: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  remainingInfo: {
    flex: 1,
  },
  remainingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  remainingFormula: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  remainingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  remainingPillPaid: {
    backgroundColor: '#E8F5E9',
  },
  remainingPillDue: {
    backgroundColor: '#FFF0F2',
  },
  remainingText: {
    fontSize: 15,
    fontWeight: '800',
  },
  remainingTextPaid: {
    color: '#2E7D32',
  },
  remainingTextDue: {
    color: Theme.colors.deepRose,
  },
  profitSummaryCard: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  profitLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  profitFormula: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  profitPillPositive: {
    backgroundColor: '#E8F5E9',
  },
  profitPillNegative: {
    backgroundColor: '#FFEBEE',
  },
  profitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  profitTextPositive: {
    color: '#2E7D32',
  },
  profitTextNegative: {
    color: '#C62828',
  },
  expensesCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: 12,
  },
  expensesSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  expenseFormBox: {
    backgroundColor: Theme.colors.cream,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  expenseInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textDark,
    marginBottom: 4,
  },
  expenseNotesInput: {
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: Theme.colors.textDark,
  },
  saveExpenseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.deepRose,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 10,
  },
  saveExpenseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  expensesList: {
    marginTop: 10,
  },
  expenseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.cream,
  },
  expenseItemInfo: {
    flex: 1,
    marginRight: 8,
  },
  expenseItemNotes: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  expenseItemDate: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  expenseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C62828',
  },
  expenseRemoveBtn: {
    padding: 6,
  },
  emptyExpensesText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addPhotosText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  photoList: {
    flexDirection: 'row',
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumb: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  removePhoto: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  photoPlaceholder: {
    height: 75,
    borderWidth: 1.5,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  renameCard: {
    width: '100%',
    backgroundColor: Theme.colors.white,
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  renameSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 3,
    marginBottom: 14,
  },
  renameInput: {
    backgroundColor: Theme.colors.cream,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.colors.textDark,
    marginBottom: 16,
  },
  renameBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameCancelText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  renameSaveBtn: {
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  renameSaveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
