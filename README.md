# Chore Buddy

## What does the app do?
Chore Buddy organizes household chores in a logical order by analyzing user-defined tasks and their interrelationships. The app idenitifies key "ancestor" chores that need to be completed first to prevent delays in dependent chores. The app also detects cycles (i.e. loops) in the chore sequences if existed.

## Input - Output
### Input

List of chores. Each chore includes:

- Name (required)
- Notes (optional)
- List of "child" chores (optional). "Child" chores are the ones can start only after this chore is complete.

### Output

- Order of chores to carry out, if no loop detected 

- Otherwise, an error indicating which pair of chores contain the loop (the back edge)


### Output
## Sample
1. First time accessing the app:

![First access](./images/first-access.png)

2. Add some chores

![Add a new chore](./images/add-new-chore.png)

3. Add a new chore with multiple "child" chores

![Add a new chore with multiple childs](./images/add-chore-multiple-select.png)

4. Edit a chore

![Edit a chore](./images/edit-chore.png)

5. 9 chores before sort

![Before sort](./images/before-sort.png)

6. 9 chores after sort

![After sort](./images/after-sort-1.png)

![After sort - continued](./images/after-sort-2.png)

7. Try closing your browser and access the app again. Your chores persist!

8. Try adding a loop

![Add loop chore](./images/add-loop.png)

9. Error displayed when sorting with loop

![Sort error](./images/sort-error.png)