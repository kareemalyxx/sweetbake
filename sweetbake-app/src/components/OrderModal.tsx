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
import { CakeOrder, OrderStatus } from '../types';
import { Theme } from '../theme';
import { CAKE_TYPES, CAKE_SHAPES, CAKE_FLAVORS } from '../constants';
import { StorageService } from '../services/storage';
import { triggerHaptic } from '../services/haptics';

interface OrderModalProps {
  visible: boolean;
  orderToEdit?: CakeOrder | null;
  initialDate?: Date; // Used when adding an order from the calendar on a specific date
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
  
  // Custom Date & Time Picker State
  const [targetYear, setTargetYear] = useState(new Date().getFullYear());
  const [targetMonth, setTargetMonth] = useState(new Date().getMonth()); // 0-indexed
  const [targetDay, setTargetDay] = useState(new Date().getDate());
  const [selectedHour12, setSelectedHour12] = useState(2); // 1-12
  const [selectedMinute, setSelectedMinute] = useState(0); // 0-59
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('PM');

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

  // Load custom flavors, types, and shapes from storage
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

      const d = new Date(orderToEdit.deliveryDate);
      setTargetYear(d.getFullYear());
      setTargetMonth(d.getMonth());
      setTargetDay(d.getDate());
      
      const rawH = d.getHours();
      setSelectedHour12(rawH % 12 === 0 ? 12 : rawH % 12);
      setSelectedMinute(d.getMinutes());
      setSelectedAmPm(rawH >= 12 ? 'PM' : 'AM');
    } else {
      setCustomerName('');
      setCakeType(availableCakeTypes[0] || CAKE_TYPES[0]);
      setShape(availableShapes[0] || CAKE_SHAPES[0]);
      setFlavor(availableFlavors[0] || CAKE_FLAVORS[0]);
      setStatus('Pending');
      setPriceStr('85');
      setCustomRequirements('');
      setReferenceImages([]);

      const baseDate = initialDate || new Date(Date.now() + 3 * 24 * 3600 * 1000);
      setTargetYear(baseDate.getFullYear());
      setTargetMonth(baseDate.getMonth());
      setTargetDay(baseDate.getDate());
      setSelectedHour12(2);
      setSelectedMinute(0);
      setSelectedAmPm('PM');
    }
  }, [orderToEdit, initialDate, visible]);

  // Flavor handler
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

  // Cake Type handler
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

  // Shape handler
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
    
    // Calculate 24h format for finalDate
    let convertedHour = selectedHour12 % 12;
    if (selectedAmPm === 'PM') {
      convertedHour += 12;
    }
    const finalDate = new Date(targetYear, targetMonth, targetDay, convertedHour, selectedMinute, 0);

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
      deliveryDate: finalDate.toISOString(),
      referenceImages,
    });
    onClose();
  };

  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

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

            {/* Section 2: Delivery Date & Time (Editable for all orders) */}
            <View style={styles.section}>
              <View style={styles.titleWithAction}>
                <Text style={styles.sectionTitle}>Delivery / Due Date & Time</Text>
                <View style={styles.dateBadge}>
                  <Ionicons name="calendar" size={13} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                  <Text style={styles.dateBadgeText}>
                    {monthNames[targetMonth]} {targetDay}, {targetYear} @ {selectedHour12}:{String(selectedMinute).padStart(2, '0')} {selectedAmPm}
                  </Text>
                </View>
              </View>

              {/* Month Selector */}
              <Text style={styles.fieldLabel}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {monthNames.map((m, idx) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.chip, targetMonth === idx && styles.chipActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setTargetMonth(idx);
                      // Adjust day if selected day exceeds max days of new month
                      const maxDays = new Date(targetYear, idx + 1, 0).getDate();
                      if (targetDay > maxDays) setTargetDay(maxDays);
                    }}
                  >
                    <Text style={[styles.chipText, targetMonth === idx && styles.chipTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Day Selector */}
              <Text style={styles.fieldLabel}>Day of the Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.smallDayPill, targetDay === d && styles.smallDayPillActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setTargetDay(d);
                    }}
                  >
                    <Text style={[styles.smallDayPillText, targetDay === d && styles.smallDayPillTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Year Selector */}
              <Text style={styles.fieldLabel}>Year</Text>
              <View style={styles.yearRow}>
                {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.yearChip, targetYear === y && styles.yearChipActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setTargetYear(y);
                    }}
                  >
                    <Text style={[styles.yearChipText, targetYear === y && styles.yearChipTextActive]}>
                      {y}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Full Time Picker (Hour, Minute, AM/PM) */}
              <View style={styles.timeSectionHeader}>
                <Text style={styles.fieldLabel}>Pickup / Delivery Time</Text>
                <View style={styles.timePreviewBadge}>
                  <Ionicons name="time-outline" size={13} color={Theme.colors.deepRose} style={{ marginRight: 4 }} />
                  <Text style={styles.timePreviewText}>
                    {selectedHour12}:{String(selectedMinute).padStart(2, '0')} {selectedAmPm}
                  </Text>
                </View>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.ampmRow}>
                {(['AM', 'PM'] as const).map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[styles.ampmButton, selectedAmPm === period && styles.ampmButtonActive]}
                    onPress={() => {
                      triggerHaptic.selection();
                      setSelectedAmPm(period);
                    }}
                  >
                    <Text style={[styles.ampmText, selectedAmPm === period && styles.ampmTextActive]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hour Selector (1 - 12) */}
              <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Hour (1 - 12)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                  const isSelected = selectedHour12 === h;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.smallDayPill, isSelected && styles.smallDayPillActive]}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSelectedHour12(h);
                      }}
                    >
                      <Text style={[styles.smallDayPillText, isSelected && styles.smallDayPillTextActive]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Minute Selector (Every 5 mins + custom options) */}
              <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Minute</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => {
                  const isSelected = selectedMinute === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.smallDayPill, isSelected && styles.smallDayPillActive]}
                      onPress={() => {
                        triggerHaptic.selection();
                        setSelectedMinute(m);
                      }}
                    >
                      <Text style={[styles.smallDayPillText, isSelected && styles.smallDayPillTextActive]}>
                        :{String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section 3: Cake Specifications (Type, Shape, Flavor) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cake Specifications</Text>

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
                  >
                    <Text style={[styles.chipText, shape === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* 3. Flavor & Filling (With persistent custom addition) */}
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
  titleWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.blushPink,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepRose,
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
  smallDayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.warmIvory,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  smallDayPillActive: {
    backgroundColor: Theme.colors.deepRose,
  },
  smallDayPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  smallDayPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  yearRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  yearChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.warmIvory,
    alignItems: 'center',
  },
  yearChipActive: {
    backgroundColor: Theme.colors.blushPink,
    borderWidth: 1.5,
    borderColor: Theme.colors.deepRose,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  yearChipTextActive: {
    color: Theme.colors.deepRose,
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
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  timePreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.warmIvory,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.pill,
    borderWidth: 1,
    borderColor: Theme.colors.pastelRose,
  },
  timePreviewText: {
    fontSize: 12,
    fontWeight: '800',
    color: Theme.colors.deepRose,
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  ampmButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.warmIvory,
    alignItems: 'center',
  },
  ampmButtonActive: {
    backgroundColor: Theme.colors.deepRose,
  },
  ampmText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.textDark,
  },
  ampmTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
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
});
