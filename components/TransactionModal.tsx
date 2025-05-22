import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from 'react-native';
import { Collaborator } from '../types/user';

interface TransactionModalProps {
  visible: boolean;
  // List of collaborators (e.g. their names or IDs)
  collaborators: Collaborator[];
  onSubmit: (data: { collaboratorId: string; currency: string; amount: number; description: string }) => void;
  onClose: () => void;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  collaborators,
  onSubmit,
  onClose,
}) => {
  // Use state to store the selected collaborator
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator>(
    collaborators[0] || { uid: '', name: '' }
  );
  // Whether to show the collaborator selection list
  const [showCollaboratorList, setShowCollaboratorList] = useState(false);
  const [currency, setCurrency] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!selectedCollaborator.uid || !currency || !amount) {
      console.error('All fields are required.');
      return;
    }
    onSubmit({
      collaboratorId: selectedCollaborator.uid,
      currency,
      amount: parseFloat(amount),
      description,
    });
    // Optionally clear fields after submission
    setCurrency('');
    setAmount('');
    setDescription('');
  };

  // Render a single collaborator item in the selection list
  const renderCollaborator = ({ item }: { item: Collaborator }) => (
    <TouchableOpacity
      style={styles.collaboratorItem}
      onPress={() => {
        setSelectedCollaborator(item);
        setShowCollaboratorList(false);
      }}
    >
      <Text>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create Transaction</Text>

          <Text style={styles.label}>Select Collaborator:</Text>
          {/* Instead of using a dropdown picker, we use a touchable box */}
          <TouchableOpacity
            style={styles.selectionBox}
            onPress={() => setShowCollaboratorList(true)}
            >
            <Text>
              {selectedCollaborator && selectedCollaborator.name
                ? selectedCollaborator.name
                : 'Select a collaborator'}
            </Text>
          </TouchableOpacity>
          {showCollaboratorList && (
            <FlatList
              data={collaborators}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => renderCollaborator({ item })}
              style={styles.collaboratorList}
            />
          )}

          <Text style={styles.label}>Currency:</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. USD, EUR"
            value={currency}
            onChangeText={setCurrency}
          />

          <Text style={styles.label}>Amount:</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Description:</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 12,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: Platform.OS === 'ios' ? 12 : 8,
    marginTop: 4,
  },
  selectionBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: Platform.OS === 'ios' ? 12 : 8,
    marginTop: 4,
  },
  collaboratorList: {
    maxHeight: 150,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  collaboratorItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#aaa',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default TransactionModal;
