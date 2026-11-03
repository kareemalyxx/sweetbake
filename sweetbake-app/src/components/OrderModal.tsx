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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { CakeOrder, OrderStatus } from '../types';
import { Theme } from '../theme';
import { CAKE_TYPES, CAKE_SHAPES, CAKE_FLAVORS } from '../constants';
import { StorageService } from '../services/storage';
import { triggerHaptic } from '../services/haptics';

interface OrderModalProps {
  visible: boolean;
  orderToEdit?: CakeOrder | null;
  initialDate?: Date;
  onClose: () => void;
  onSave: (order: Partial<CakeOrder>) => void;
}

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
  const [status, setStatus] = useState<OrderStatus>('Pending');
  const [priceStr, setPriceStr] = useState('85');
  const [customRequirements, setCustomRequirements] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  // Native Date & Time objects
  const [deliveryDate, setDeliveryDate] = useState<Date>(
    initialDate || new Date(Date.now() + 3 * 24 * 3600 * 1000)
  );

  // Pop-up picker controllers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Dynamic customization lists
  const [availableFlavors, setAvailableFlavors] = useState<string[]>(CAKE_FLAVORS);
  const [availableCakeTypes, setAvailableCakeTypes] = useState<string[]>(CAKE_TYPES);
  const [availableShapes, setAvailableShapes] = useState<string[]>(CAKE_SHAPES);

  // Add new item prompt states
  const [newFlavorInput, setNewFlavorInput] = useState('');
  const [showAddFlavor, setShowAddFlavor] = useState(false);

  const [newTypeInput, setNewTypeInput] = useState('');
  const [showAddType, setShowAddType] = useState(false);

  const [newShapeInput, setNewShapeInput] = useState('');
  const [showAddShape, setShowAddShape] = useState(false);

  // Rename modal states
  const [renameTarget, setRenameTarget] = useState<{
    category: 'Type' | 'Shape' | 'Flavor';
    oldValue: string;
  } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  useEffect(() => {
    const loadDynamicOptions = async () => {
      const storedFlavors = await StorageService.getFlavors(CAKE_FLAVORS);
      const storedTypes = await StorageService.getCakeTypes(CAKE_TYPES);
      const storedShapes = await StorageService.getCakeShapes(CAKE_SHAPES);
      setAvailableFlavors(storedFlavors);
      setAvailableCakeTypes(storedTypes);
      setAvailableShapes(storedShapes);
    };
    loadDynamicOptions();
  }, []);

  useEffect(() => {
    if (orderToEdit) {
      setCustomerName(orderToEdit.customerName);
      setCakeType(orderToEdit.cakeType);
      setShape(orderToEdit.shape);
      setFlavor(orderToEdit.flavor);
      setStatus(orderToEdit.status);
      setPriceStr(String(orderToEdit.quotedPrice));
      setCustomRequirements(orderToEdit.customRequirements || '');
      setReferenceImages(orderToEdit.referenceImages || []);
      setDeliveryDate(new Date(orderToEdit.deliveryDate));
    } else {
      setCustomerName('');
      setCakeType(availableCakeTypes[0] || CAKE_TYPES[0]);
      setShape(availableShapes[0] || CAKE_SHAPES[0]);
      setFlavor(availableFlavors[0] || CAKE_FLAVORS[0]);
      setStatus('Pending');
      setPriceStr('85');
      setCustomRequirements('');
      setReferenceImages([]);

      const target = initialDate || new Date(Date.now() + 3 * 24 * 3600 * 1000);
      target.setHours(14, 0, 0, 0);
      setDeliveryDate(target);
    }
    setShowDatePicker(false);
    setShowTimePicker(false);
  }, [orderToEdit, initialDate, visible]);

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

  // Open Rename dialog on long press
  const openRenameModal = (category: 'Type' | 'Shape' | 'Flavor', value: string) => {
    triggerHaptic.heavy();
    setRenameTarget({ category, oldValue: value });
    setRenameInputValue(value);
  };

  // Confirm Rename action
  const confirmRename = async () => {
    if (!renameTarget) return;
    const trimmed = renameInputValue.trim();
    if (!trimmed || trimmed === renameTarget.oldValue) {
      setRenameTarget(null);
      return;
    }

    triggerHaptic.success();
    const { category, oldValue } = renameTarget;

    if (category === 'Flavor') {
      const updated = availableFlavors.map((item) => (item === oldValue ? trimmed : item));
      setAvailableFlavors(updated);
      if (flavor === oldValue) setFlavor(trimmed);
      await StorageService.saveFlavors(updated);
    } else if (category === 'Type') {
      const updated = availableCakeTypes.map((item) => (item === oldValue ? trimmed : item));
      setAvailableCakeTypes(updated);
      if (cakeType === oldValue) setCakeType(trimmed);
      await StorageService.saveCakeTypes(updated);
    } else if (category === 'Shape') {
      const updated = availableShapes.map((item) => (item === oldValue ? trimmed : item));
      setAvailableShapes(updated);
      if (shape === oldValue) setShape(trimmed);
      await StorageService.saveCakeShapes(updated);
    }

    setRenameTarget(null);
  };

  const pickImages = async () => {
    triggerHaptic.selection();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const uris = result.assets.map((a) => a.uri);
      setReferenceImages((prev) => [...prev, ...uris]);
      triggerHaptic.light();
    }
  };

  const removeImage = (index: number) => {
    triggerHaptic.light();
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!customerName.trim()) {
      Alert.alert('Customer Name Required', 'Please enter the client or customer name.');
      return;
    }

    const price = parseFloat(priceStr) || 0;
    triggerHaptic.success();
    onSave({
      id: orderToEdit ? orderToEdit.id : undefined,
      customerName: customerName.trim(),
      cakeType,
      shape,
      flavor,
      status,
      quotedPrice: price,
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
              <Text style={styles.sectionTitle}>Client & Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Customer Full Name (e.g. Sophia Miller)"
                placeholderTextColor={Theme.colors.textSecondary}
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            {/* Section 2: Delivery Date & Time (Pop-up native Calendar & Clock Knob) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery / Due Schedule</Text>
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
                  <Text style={styles.pickerLabel}>Delivery Date</Text>
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
                  <Text style={styles.pickerLabel}>Pickup / Ready Time</Text>
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
            </View>

            {/* Section 3: Cake Specifications (Type, Shape, Flavor) */}
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
            </View>

            {/* Section 4: Status & Pricing */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status & Financials</Text>

              <Text style={styles.fieldLabel}>Status</Text>
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

              <Text style={styles.fieldLabel}>Quoted Commission Price ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 120"
                placeholderTextColor={Theme.colors.textSecondary}
                keyboardType="decimal-pad"
                value={priceStr}
                onChangeText={setPriceStr}
              />
            </View>

            {/* Section 5: Photo Attachments */}
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

            {/* Section 6: Custom Requirements */}
            <View style={[styles.section, { marginBottom: 40 }]}>
              <Text style={styles.sectionTitle}>Dietary Notes & Custom Piping</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Edible gold leaf, gluten-free almond flour, write 'Happy Birthday Bella' in lavender cursive..."
                placeholderTextColor={Theme.colors.textSecondary}
                multiline
                numberOfLines={4}
                value={customRequirements}
                onChangeText={setCustomRequirements}
              />
            </View>
          </ScrollView>

          {/* Long-Press Rename Modal Dialog */}
          <Modal
            visible={renameTarget !== null}
            transparent
            animationType="fade"
          >
            <View style={styles.renameOverlay}>
              <View style={styles.renameCard}>
                <View style={styles.renameHeader}>
                  <Ionicons name="pencil" size={18} color={Theme.colors.deepRose} style={{ marginRight: 6 }} />
                  <Text style={styles.renameTitle}>Rename {renameTarget?.category}</Text>
                </View>
                <Text style={styles.renameSubtitle}>
                  Change name from "{renameTarget?.oldValue}":
                </Text>
                
                <TextInput
                  style={styles.renameInput}
                  value={renameInputValue}
                  onChangeText={setRenameInputValue}
                  placeholder={`Enter new ${renameTarget?.category?.toLowerCase()} name...`}
                  placeholderTextColor={Theme.colors.textSecondary}
                  autoFocus
                />

                <View style={styles.renameActions}>
                  <TouchableOpacity
                    style={styles.renameCancelBtn}
                    onPress={() => setRenameTarget(null)}
                  >
                    <Text style={styles.renameCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.renameConfirmBtn}
                    onPress={confirmRename}
                  >
                    <Text style={styles.renameConfirmText}>Rename</Text>
                  </TouchableOpacity>
                </View>
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  headerButton: {
    padding: 6,
  },
  cancelText: {
    fontSize: 16,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.card,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.textMauve,
    marginBottom: 4,
  },
  fieldSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginTop: 8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: Theme.borderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.colors.textDark,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: Theme.borderRadius.input,
    padding: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  pickerButtonActive: {
    borderColor: Theme.colors.deepRose,
    backgroundColor: Theme.colors.blushPink,
  },
  pickerIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Theme.colors.blushPink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.textDark,
    marginTop: 2,
  },
  inlinePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.pastelRose,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  donePickerBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.pill,
    marginVertical: 6,
    marginRight: 6,
  },
  donePickerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  titleWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    backgroundColor: Theme.colors.warmIvory,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.pill,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Theme.colors.deepRose,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textDark,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inlineAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepRose,
  },
  addItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: Theme.borderRadius.input,
    padding: 6,
    marginBottom: 8,
    gap: 8,
  },
  addItemInput: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.textDark,
    paddingHorizontal: 8,
  },
  addItemSaveBtn: {
    backgroundColor: Theme.colors.deepRose,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.pill,
  },
  addItemSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.warmIvory,
    alignItems: 'center',
  },
  statusTabActive: {
    backgroundColor: Theme.colors.blushPink,
    borderWidth: 1.5,
    borderColor: Theme.colors.deepRose,
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  statusTabTextActive: {
    color: Theme.colors.deepRose,
    fontWeight: '800',
  },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    top: -4,
    right: -4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderColor: Theme.colors.pastelRose,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 6,
    fontWeight: '600',
  },
  renameOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  renameCard: {
    width: '100%',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.textDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Theme.colors.textDark,
  },
  renameSubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginBottom: 14,
  },
  renameInput: {
    backgroundColor: Theme.colors.warmIvory,
    borderRadius: Theme.borderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.colors.textDark,
    borderWidth: 1,
    borderColor: Theme.colors.pastelRose,
    marginBottom: 16,
  },
  renameActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  renameCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.warmIvory,
  },
  renameCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  renameConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.deepRose,
  },
  renameConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
