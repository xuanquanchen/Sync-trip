import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  FlatList,
  StyleSheet,
} from "react-native";
import {
  Button,
  List,
  Text,
  SegmentedButtons,
  Card, 
  Divider,
} from 'react-native-paper';
import { useBillTransaction } from "../context/BillAndTransactionContext";
import { useTrip } from "../context/TripContext";
import { useUser } from "../context/UserContext";
import { getUserById } from "../utils/userAPI";
import { Bill } from "../types/Bill";
import TransactionModal from "../components/TransactionModal";
import BillDetailModal from "../components/BillDetailModal";
import { Collaborator } from "../types/User";
import {sendBillCreateNotification, sendBillUpdateNotification} from "../utils/NotificationService";
import {useAppNavigation} from "../navigation/useAppNavigation";

const BillScreen = () => {
  // Retrieve bills and transactions from the BillTransactionContext
  const { bills, createBill, updateBill, deleteBill, archiveBill, restoreBill } = useBillTransaction();
  // Retrieve the current trip information from the TripContext
  const { currentTrip } = useTrip();
  const { currentUser } = useUser();
  const currentUserUid = currentUser?.uid ?? "";

  const [billModalVisible, setBillModalVisible] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [collaboratorsFull, setCollaboratorsFull] = useState<Collaborator[]>([]);
  const [segment, setSegment] = useState<'active' | 'archived'>('active');

  const activeBills   = bills.filter(b => !b.archived);
  const archivedBills = bills.filter(b => b.archived);

  const navigation = useAppNavigation();

  // redirect away if no user
  useEffect(() => {
    if (!currentUser) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [currentUser, navigation]);

  useEffect(() => {
    setSegment('active');
    setSelectedBill(null);
    setBillModalVisible(false);
  }, [currentTrip?.id]);

  useEffect(() => {
    console.log('🔔 [BillScreen] bills state:', bills.map(b => ({
      id: b.id,
      archived: b.archived,
    })), ' segment=', segment);
  }, [bills, segment]);

  useEffect(() => {
    async function fetchCollaborators() {
      if (!currentTrip) return;

      const uidSet = new Set<string>(currentTrip.collaborators || []);
      if (currentTrip.ownerId) uidSet.add(currentTrip.ownerId);
      try {
        const fetched: Collaborator[] = await Promise.all(
          Array.from(uidSet).map(async uid => {
            const user = await getUserById(uid);
            return { uid, name: user.name || uid };
          })
        );
        setCollaboratorsFull(fetched);
      } catch (error) {
          console.error("Error fetching collaborators:", error);
          setCollaboratorsFull([]);
      }
    }
    fetchCollaborators();
  }, [currentTrip]);

  const handleBillPress = (id: string) => {
    const b = bills.find(x => x.id === id) ?? null;
    setSelectedBill(b);
    setBillModalVisible(true);
  };

  const handleArchive = async (id: string) => {
    console.log('🔔 BillScreen.handleArchive called with id', id);
    await archiveBill(id);
    console.log('🔔 BillScreen.handleArchive: archiveBill resolved for id', id);
    setSegment('archived');
    setBillModalVisible(false);
  };

  const handleRestore = async (id: string) => {
    await restoreBill(id);
  };

  const balanceForUser = (bill: Bill, uid: string): number => {
    if (!bill.summary) return 0;
    let bal = 0;
    Object.entries(bill.summary).forEach(([debtorUid, credits]) => {
      Object.entries(credits as Record<string, number>).forEach(([creditorUid, amount]) => {
        if (debtorUid === uid)    bal -= amount;
        if (creditorUid === uid)  bal += amount;
      });
    });
    return bal;
  };

  const handleCreateBill = async () => {
    if (!currentTrip || !currentUser) return;
    const newBill = {
      title: "New Bill",
      participants: [],
      summary: {},
      currency: "USD",
      isDraft: true,
      archived: false,
      description: "",
      category: "",
      createdBy: currentUserUid,
    } as Omit<Bill, "id">;
    try {
      const billId = await createBill(newBill);
      //send new bill notification
      await sendBillCreateNotification({id:billId, ...newBill});
      setSelectedBill({ id: billId, ...newBill });
      setBillModalVisible(true);
    } catch (error) {
      console.error("Failed to create new bill:", error);
    }
  };

  const handleBillSave = async (updated: Partial<Bill>) => {
    if (!updated.id && selectedBill) {
      updated = { id: selectedBill.id, ...updated };
    }
    try {
      await updateBill(updated.id!, {
        title: updated.title,
        participants: updated.participants ?? selectedBill?.participants ?? [],
        summary: updated.summary ?? selectedBill?.summary ?? {},
        currency: updated.currency ?? selectedBill?.currency ?? 'USD',
        description: updated.description ?? selectedBill?.description ?? '',
        category: updated.category ?? selectedBill?.category ?? '',
        isDraft: false,
      });
      //send bill update notification
      await sendBillUpdateNotification(updated as Bill);
    } catch (error) {
      console.error("Failed to update bill:", error);
    }
  };

  const debtSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    collaboratorsFull.forEach(c => { summary[c.uid] = 0 });
  
    activeBills.forEach(bill => {
      Object.entries(bill.summary || {}).forEach(([debtor, credits]) => {
        Object.entries(credits as Record<string, number>).forEach(([creditor, amount]) => {
          if (debtor === currentUserUid && creditor !== currentUserUid) {
            summary[creditor] -= amount;
          } else if (creditor === currentUserUid && debtor !== currentUserUid) {
            summary[debtor] += amount;
          }
        });
      });
    });
  
    return summary;
  }, [activeBills, collaboratorsFull, currentUserUid]);

  const totalYouOwe = useMemo(
    () => Object.values(debtSummary).filter(v => v < 0).reduce((sum, v) => sum + (-v), 0),
    [debtSummary]
  );

  const totalYouReceive = useMemo(
    () => Object.values(debtSummary).filter(v => v > 0).reduce((sum, v) => sum + v, 0),
    [debtSummary]
  );

  const netBalance = totalYouReceive - totalYouOwe;

  const makeSections = (list: Bill[]) => {
    const map: Record<string, Bill[]> = {};
    list.forEach(bill => {
      const cat = bill.category || "Uncategorized";
      if (!map[cat]) map[cat] = [];
      map[cat].push(bill);
    });
    return Object.entries(map)
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => a.title.localeCompare(b.title));
  };

  const activeSections = useMemo(() => makeSections(activeBills), [activeBills]);
  const archivedSections = useMemo(() => makeSections(archivedBills), [archivedBills]);

  if (!currentTrip) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>Please select a trip on dashboard</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        Bill Screen for Trip: {currentTrip?.title || "No Trip Selected"}
      </Text>

      {Object.values(debtSummary).some(v => v !== 0) && (
        <Card style={styles.debtCard}>
          <Card.Title title="Balance Summary" />
          <Card.Content>
            {Object.entries(debtSummary).map(([uid, amt]) => {
              if (amt === 0) return null;
              const name = collaboratorsFull.find(c => c.uid === uid)?.name || uid;
              const isReceive = amt > 0;
                return (
                <Text key={uid} style={styles.debtLine}>
                  {isReceive
                    ? `${name} owes you `
                    : `You owe `}
                  <Text style={isReceive ? styles.receives : styles.owes}>
                    ${Math.abs(amt).toFixed(2)}
                  </Text>
                  {isReceive ? '' : ` to ${name}`}
                </Text>
                );
            })}
            <Divider style={styles.debtDivider} />
             <Text style={styles.totalText}>
               {netBalance >= 0
                 ? 'Total you receive: '
                 : 'Total you owe: '}
               <Text style={netBalance >= 0 ? styles.receives : styles.owes}>
                 ${Math.abs(netBalance).toFixed(2)}
               </Text>
             </Text>
          </Card.Content>
        </Card>
      )}

     {segment === 'active' ? (
        <FlatList
          key="active"
          data={activeBills}
          extraData={[bills]}
          keyExtractor={(item, index) =>
            item.id?.trim() ? item.id : `bill_${index}`
          }
          renderItem={({ item }) => {
            const creatorName = collaboratorsFull.find(c => c.uid === item.createdBy)?.name ?? 'Unknown';
            const bal = balanceForUser(item, currentUser?.uid ?? '');
            const bg =
              bal > 0   ? '#e8ffea'
            : bal < 0   ? '#ffecec'
            : undefined;

            return (
              <List.Item
                title={item.title}
                description={() => (
                  <View>
                    <Text style={styles.creator}>Created by {creatorName}</Text>
                    <View style={styles.itemDescription}>
                      <Text style={styles.categoryBadge}>
                        {item.category || 'Uncategorized'}
                      </Text>
                      <Text style={styles.balanceText}>
                        {bal === 0
                          ? 'No balance'
                          : bal > 0
                          ? `Receives $${bal.toFixed(2)}`
                          : `Owes $${(-bal).toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}
                onPress={() => {
                  handleBillPress(item.id)
                }}
                style={[styles.billItem, bg && { backgroundColor: bg }]}
                left={props => <List.Icon {...props} icon="file-document-outline" />}
              />
            );
          }}
        />
      ) : (
        <FlatList
          key="archived"
          data={archivedBills}
          extraData={[bills]}
          keyExtractor={(item, index) =>
            item.id?.trim() ? item.id : `bill_${index}`
          }
          renderItem={({ item }) => {
            const creatorName = collaboratorsFull.find(c => c.uid === item.createdBy)?.name ?? 'Unknown';
            const bal = balanceForUser(item, currentUser?.uid ?? '');
            const bg =
              bal > 0   ? '#e8ffea'
            : bal < 0   ? '#ffecec'
            : undefined;

            return (
              <List.Item
                title={item.title}
                description={() => (
                  <View>
                    <Text style={styles.creator}>Created by {creatorName}</Text>
                    <View style={styles.itemDescription}>
                      <Text style={styles.categoryBadge}>
                        {item.category || 'Uncategorized'}
                      </Text>
                      <Text style={styles.balanceText}>
                        {bal === 0
                          ? 'No balance'
                          : bal > 0
                          ? `Receives $${bal.toFixed(2)}`
                          : `Owes $${(-bal).toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}
                onPress={() => {
                  handleBillPress(item.id)
                }}
                style={[styles.billItem, bg && { backgroundColor: bg }]}
                left={props => <List.Icon {...props} icon="file-document-outline" />}
              />
            );
          }}
        />
      )}

      <Button
        testID="createBill"
        mode="contained"
        onPress={handleCreateBill}
        style={styles.createButton}
      >
        Create New Bill
      </Button>

      <SegmentedButtons
        value={segment}
        onValueChange={v => setSegment(v as any)}
        buttons={[
          { value: 'active',   label: 'Active' },
          { value: 'archived', label: 'Archived' },
        ]}
      />

      <BillDetailModal
        visible={billModalVisible}
        bill={selectedBill}
        collaborators={collaboratorsFull}
        currentUserUid={currentUser?.uid ?? ''}
        onClose={() => setBillModalVisible(false)}
        onSave={handleBillSave}
        onArchive={handleArchive}
        onRestore={handleRestore} 
        onDelete={async id => {
          await deleteBill(id);
          setBillModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { marginBottom: 16, fontSize: 18, fontWeight: 'bold' },
  createButton: {
    marginTop: 10,
    alignSelf: 'center',
    width: 180,
    marginBottom: 10,
  },
  debtCard: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  debtLine: {
    marginVertical: 4,
    fontSize: 14,
  },
  debtDivider: {
    marginVertical: 8,
  },
  totalOweText: {
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'right',
  },
  billItem: {
    borderRadius: 8,
    marginVertical: 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  itemDescription: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    fontWeight: 'bold'
  },
  balanceText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  receives: {
    color: 'green',
  },
  owes: {
    color: 'red',
  },
  totalText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 8,
  },
  creator: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
  },
});

export default BillScreen;