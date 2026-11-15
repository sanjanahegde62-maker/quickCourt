#include <iostream>
#include <vector>
#include <string>
#include <iomanip>
using namespace std;

// Timetable Conflict Graph using Greedy Graph Coloring Algorithm
class TimetableScheduler {
    int V;                         // Number of examination courses
    vector<string> courseNames;    // Course titles
    vector<vector<int>> adj;       // Adjacency list storing conflict edges
    vector<int> slot;              // Assigned time slot (color) for each exam

public:
    TimetableScheduler(int n) : V(n), courseNames(n), adj(n), slot(n, -1) {}

    void addExam(int id, const string& name) { 
        courseNames[id] = name; 
    }

    void addConflict(int u, int v) { // Undirected conflict edge: shared student enrollments
        adj[u].push_back(v);
        adj[v].push_back(u);
    }

    // Core Greedy Graph Coloring Algorithm
    void greedyColoring() {
        slot[0] = 0; // Assign the first time slot (Slot 0) to the first exam
        vector<bool> unavailable(V, false);

        for (int u = 1; u < V; u++) {
            // Mark time slots of all adjacent exams as unavailable
            for (int neighbor : adj[u])
                if (slot[neighbor] != -1)
                    unavailable[slot[neighbor]] = true;

            // Find the lowest-indexed available time slot
            int cr = 0;
            while (cr < V && unavailable[cr]) cr++;
            slot[u] = cr;

            // Reset unavailable flags for the next vertex iteration
            for (int neighbor : adj[u])
                if (slot[neighbor] != -1)
                    unavailable[slot[neighbor]] = false;
        }
    }

    // Automated verification: Ensure no conflicting exams share the same slot
    bool verify() {
        for (int u = 0; u < V; u++)
            for (int v : adj[u])
                if (slot[u] == slot[v]) return false;
        return true;
    }

    // Display timetable schedule and conflict verification
    void printSchedule() {
        cout << "\n=========================================================\n";
        cout << "       COLLEGE EXAMINATION TIMETABLE (GRAPH COLORING)    \n";
        cout << "=========================================================\n";
        cout << left << setw(8) << "ExamID" << setw(34) << "Course Name" << "Assigned Time Slot\n";
        cout << "---------------------------------------------------------\n";
        int maxSlot = 0;
        for (int i = 0; i < V; i++) {
            cout << left << setw(8) << i << setw(34) << courseNames[i] << "Slot " << (slot[i] + 1) << "\n";
            if (slot[i] > maxSlot) maxSlot = slot[i];
        }
        cout << "---------------------------------------------------------\n";
        cout << "Total Slots Needed: " << (maxSlot + 1) << "\n";
        cout << "Conflict Constraint Verification: " 
             << (verify() ? "PASSED (0 Conflicts Detected)" : "FAILED") << "\n";
        cout << "=========================================================\n";
    }
};

int main() {
    int n = 6;
    TimetableScheduler scheduler(n);
    scheduler.addExam(0, "Design & Analysis of Algorithms");
    scheduler.addExam(1, "Operating Systems");
    scheduler.addExam(2, "Database Management Systems");
    scheduler.addExam(3, "Discrete Mathematics");
    scheduler.addExam(4, "Computer Organization & Arch.");
    scheduler.addExam(5, "Universal Human Values");

    // Register conflict edges (courses sharing common student enrollments)
    scheduler.addConflict(0, 1); scheduler.addConflict(0, 2); scheduler.addConflict(0, 3);
    scheduler.addConflict(1, 2); scheduler.addConflict(1, 4);
    scheduler.addConflict(2, 4); scheduler.addConflict(3, 5); scheduler.addConflict(4, 5);

    scheduler.greedyColoring();
    scheduler.printSchedule();
    return 0;
}
