import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import type { RootStackRouteProp, RootStackNavigationProp } from '../types/navigation';
import { Screen } from '../components/Screen';
import { useTrips } from '../context/TripsContext';

/**
 * Helper function to format a Date object to YYYY-MM-DD string
 */
const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

export const EditTripScreen: React.FC = () => {
  const route = useRoute<RootStackRouteProp<'EditTrip'>>();
  const navigation = useNavigation<RootStackNavigationProp>();
  const { tripId } = route.params;

  const { getTripById, addTrip, updateTrip } = useTrips();

  const isEditing = !!tripId;

  // Form state - maintain both string and Date representations
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Date picker state
  const [startDateObj, setStartDateObj] = useState<Date | null>(null);
  const [endDateObj, setEndDateObj] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Load existing trip data if editing
  useEffect(() => {
    if (isEditing && tripId) {
      const trip = getTripById(tripId);
      if (trip) {
        setTitle(trip.title);
        setDestination(trip.destination);
        setStartDate(trip.startDate);
        setEndDate(trip.endDate);
        setNotes(trip.notes || '');

        // Parse existing date strings to Date objects
        if (trip.startDate) {
          try {
            setStartDateObj(new Date(trip.startDate));
          } catch (e) {
            console.error('Error parsing start date:', e);
          }
        }
        if (trip.endDate) {
          try {
            setEndDateObj(new Date(trip.endDate));
          } catch (e) {
            console.error('Error parsing end date:', e);
          }
        }
      }
    }
  }, [isEditing, tripId, getTripById]);

  const handleStartDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowStartPicker(false);
    if (event.type === 'set' && date) {
      setStartDateObj(date);
      setStartDate(formatDate(date));
    }
  };

  const handleEndDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowEndPicker(false);
    if (event.type === 'set' && date) {
      setEndDateObj(date);
      setEndDate(formatDate(date));
    }
  };

  const handleSave = () => {
    // Clear previous error
    setError(null);

    // Validate required fields
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!destination.trim()) {
      setError('Destination is required');
      return;
    }

    // Prepare data
    const tripData = {
      title: title.trim(),
      destination: destination.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      notes: notes.trim() || undefined,
    };

    // Save based on mode
    if (isEditing && tripId) {
      updateTrip(tripId, tripData);
    } else {
      addTrip(tripData);
    }

    // Navigate back
    navigation.goBack();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>
            {isEditing ? 'Edit Trip' : 'Create Trip'}
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Summer Vacation"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Destination <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g., Bali, Indonesia"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowStartPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateLabel}>Start Date</Text>
                <Text style={startDate ? styles.dateValue : styles.datePlaceholder}>
                  {startDate || 'Select start date'}
                </Text>
              </TouchableOpacity>
              {showStartPicker && (
                <DateTimePicker
                  value={startDateObj ?? new Date()}
                  mode="date"
                  display="default"
                  onChange={handleStartDateChange}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateRow}
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateLabel}>End Date</Text>
                <Text style={endDate ? styles.dateValue : styles.datePlaceholder}>
                  {endDate || 'Select end date'}
                </Text>
              </TouchableOpacity>
              {showEndPicker && (
                <DateTimePicker
                  value={endDateObj ?? new Date()}
                  mode="date"
                  display="default"
                  onChange={handleEndDateChange}
                />
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional details about your trip..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Update Trip' : 'Create Trip'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#f44336',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  dateRow: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
