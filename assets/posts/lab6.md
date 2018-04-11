Lab 6 - Path Planning and Following
=====

# Abstract - Ravi and Kolby

Path Planning and Trajectory Tracking enable the RACECAR to autonomously compute and follow paths, given a starting pose, destination point, and a map. 


For path planning,  algorithms --Rapidly-exploring Random Trees (RRT) and [Theta Star](http://aigamedev.com/open/tutorials/theta-star-any-angle-paths/) (Theta\*), a variant of A* -- were tested. Between these options, Theta\* proved superior compared to RRT with its faster path computation (1.40s vs 33.44s), higher success rate (100% vs 70%), and shorter yet pursuable paths over 10 sample trials.

A Pure Pursuit implementation for trajectory tracking, with Theta\* path planning, achieved a  tracking error of 0.10m while following the path.
  
Completion of this lab enables the RACECAR to race autonomously.


# Introduction - Kolby


Path planning and trajectory tracking enable the RACECAR to drive autonomously along a self-planned route. Path planning uses a map of the environment to find a route between specified start and goal points. Then, trajectory tracking issues motor commands to follow the planned path. The RACECAR will use these modules for the upcoming autonomous race around the Stata basement.


# Design/Algorithm 
## Conceptual System Overview - Ravi and Kolby

The RACECAR uses a path planner to compute a trajectory, then uses a trajectory tracker to follow the trajectory.

Path planning, using a map of the environment as well as a start and goal pose, returns a piecewise linear trajectory of piecewise linear paths for the RACECAR to follow. Two algorithms -- Rapidly-exploring random trees (RRT) and  [Theta Star](http://aigamedev.com/open/tutorials/theta-star-any-angle-paths/) (Theta\*), a variant of A* -- were tested for trajectory tracking.


Trajectory tracking, implemented via Pure Pursuit, actuates the robot along this path. Pure Pursuit uses localization information (implemented in Lab 5) to repeatedly find a lookahead point on the piecewise linear trajectory, and then drives the robot towards this point.


<center>**Figure 1: System Architecture**<br/><span>
![System Architecture](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/system_diagram.jpg =520x310)</span><br/>
_The above figure illustrates the steps for path planning and trajectory tracking. First, start and goal poses are selected via rviz. Then, using the given map, Path Planning computes a trajectory. Finally, Trajectory Tracking computes and issues RACECAR drive commands._</center>


## Path Planning - Ravi and Sabina
We tested the Rapidly-exploring Random Trees (RRT) and Theta\* path planning algorithms; RRT returns navigable paths, whereas Theta\* returns shortest paths (determined by a heuristic).


### RRT - Ravi
RRT iteratively computes navigable paths through a stochastic process. It first adds the initial pose \\((x, y, \theta)\\) to a tree. Then, for each iteration \\(n\\), the algorithm randomly picks a unobstructed point \\(r\\) in the world. It then finds the closest poses already in the tree. For each closest pose \\(\vec{p}\\), it computes whether the RACECAR can drive along an arc between \\(\vec{p}\\) and \\(r\\). (See Figure 2 below for an illustration.) If so, RRT recursively repeats this calculation on the parents of \\(\vec{p}\\) to find the highest-level parent \\(\vec{q}\\) such that a navigable path exists. Given \\(\vec{q}\\), RRT then converts \\(r\\) to a pose. This pose is added to the tree beneath \\(\vec{q}\\). The last iteration \\(n\\) computes paths uses the destination instead of a randomly-selected point.


<center>**Figure 2: Navigable (Left) and Obstructed (Right) RRT Paths**<br/>
![Navigable (Left) and Obstructed (Right) RRT Paths](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/rrt_paths.PNG)<br/>
_The above figures shows navigable (left) and obstructed (right) RRT paths for randomly selected points (green). The blue vector represents a nearest pose already in the tree. On the left, the purple pose would be added to the tree as a child of the blue pose. However, on the right, RRT would ignore the green point because of the obstructed path._</center>


Finally, RRT returns the best path from the options ending at the goal, if such paths exist. The arc-shaped trajectories between waypoints are subdivided into many linear segments, so the overall best path is returned as a piecewise linear path.

Specifications for navigable paths, heuristics for the best path, and iteration and randomness parameters are detailed in the implementation section.


### Theta\* - Ravi and Sabina
Theta\*, an A*-based search algorithm, computes any-angle shortest paths in a discrete grid by relaxing neighbor constraints, applying heuristics to bias search nodes, and checking for line-of-sight between nodes. 

A* is a best-first-search algorithm that finds shortest paths using Dijkstra's Algorithm and heuristics. A* works by visiting nodes in the graph starting with the start point. It then repeatedly examines the closest not-yet-examined nodes, and adds these nodes to the set of nodes to be examined. The search continues to expand outwards from the starting point until it reaches the goal. The use of heuristics enables A* to favor searching nodes that are closer to the goal node, potentially minimizing the search time. A* is guaranteed to find a shortest path from the start to goal node (if one such path exists).

Theta\* expands on A* by using line-of-sight to relax paths between nodes, which simplifies the path by removing unnecessary intermediate nodes. When adding vertices to the graph, it sets the parent to the furthest-back cell such that an unobstructed, line-of-sight path exists. This optimization allows for any angle \\(\theta : \tan^{-1}(\theta) \in \mathbb{Q}\\) and removes intermediate waypoints in a straight line.

<center>**Figure 3: Theta\* Optimizations**<br/>
![Theta\* Optimizations](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/thetastar.png =600x300)<br/>
 _The above figure illustrates an A*-based path (left) and the optimized Theta\*-based path (right). Whereas A* creates a connection between every individual node along the path, Theta\* only connects nodes when a shorter path with direct line-of-sight exists. [Image Credits](http://aigamedev.com/static/tutorials/aap-pathcompare2D.png)_</center>



## Trajectory Tracking - Jerry, Kolby, Marek
 
Trajectory tracking follows a given path via a pure pursuit controller. This controller 1) determines the RACECAR's position relative to the path based on the closest point, 2) computes a lookahead point on the path a given distance away from the robot, and 3) accelerates towards the lookahead point. 

<center>**Figure 4: Pure Pursuit**<br/>
![Pure Pursuit](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/pure_pursuit.jpg =550x360)<br/>

*The above figure illustrates the pure pursuit algorithm. On each timestep, it first finds a "lookahead" point on the trajectory a specified distance away from the robot. Then, Ackermann steering commands are issued to navigate towards this point.*</center>


### Localizing the Robot Relative to the Path - Kolby & Marek
 
The first step in Pure Pursuit is to determine where the robot is along the path by finding the point on the path closest to the robot. Since the path is composed of linear segments, the problem becomes finding the path segment closest to the robot. Given the location of the robot and a path line segment, the shortest distance between the two is returned. Using the array of the path segments, an array of these distances can be calculated. This allows the robot to find the path segment it is closest to, which determines where the robot is relative to the path.

### Finding the lookahead point on the path - Marek


The lookahead point is found by intersecting the path with a circle centered at the robot's current location (\\(r= \text{lookahead distance}\\)), as described by [this algorithm](https://codereview.stackexchange.com/questions/86421/line-segment-to-circle-collision-algorithm/86428#86428). In particular, note that the path may intersect the circle multiple times. The lookahead point is defined as the first point on the path which is a specified "lookahead distance" away from the robot, and which is also after the robot's current location relative to the path.

Because the path is composed of line segments, the problem reduces to intersecting a circle of the lookahead radius with line segments on the path. The figure and equations below (Figure 5) illustrate how to find the lookahead point \\(x\\) for an arbitrary path segment with endpoints \\(\vec{m}\\) and \\(\vec{n}\\). The path segment vector \\(\vec{v}\\) is defined as \\(\vec{n} - \vec{m}\\). The lookahead point will always be in terms of the starting point \\(\vec{m} + \vec{v}t\\) where \\(t\\) is a scaling factor from 0 to 1. In this case, the assumption is made that the current path line segment intercepts with our lookahead range. In the case where the segment is too short, the algorithm iterates to the next segment. In the case where the path is not within the lookahead range, the algorithm pursues the closest possible point on the path.

<center>**Figure 5: Circle-Line Intersection Mathematics**<br/>
![Circle-Line Intersection Mathematics](assets/images/lab6/Circle_Line_Intersect.png)<br/>
![Circle-Line Intersection Formulas](assets/images/lab6/Circle_Intersect_Formulas.png =380x200)<br/>

*The above figure illustrates deriving the lookahead point using geometric relationships given the inputs robot location \\(q\\), path segment \\(v\\) defined by endpoints \\(m\\) and \\(n\\), and lookahead distance \\(r\\). Equation 1 defines the relationship between the robot location and the lookahead point: the distance between the robot and the lookahead point will equal the length of the radius. Equation 2 rewrites this relationship in terms of the path segment starting point and vector multiplied by the scaling variable, \\(t\\). It states that point will be on the line segment. Equation 3 uses the definition of a dot product of a vector to expand the previous equation which can be rewritten in binomial form shown in Equation 4. The remaining equations solve for \\(t\\).*</center>



### Following the Lookahead Point - Jerry
After Pure Pursuit has found the lookahead point, it uses the bicycle Ackermann steering model to compute and issue motor commands so the robot turns smoothly towards the lookahead point (Step 3 in Figure 4 above). The algorithm first transforms the lookahead point, which was originally computed in the  map coordinate frame, to the coordinate frame of the robot. The Pure Pursuit algorithm then uses the following equations (derived from the bicycle Ackermann model) to determine the steering angle needed to turn in a smooth arc towards the lookahead point (Figure 6). The robot is then commanded to drive forward, turning by using the computed steering angle.

<center>**Figure 6: Computing the Steering Angle**<br/>
\\(\text{Lookahead point}=(x, y)\\)<br/>
\\(\text{Wheelbase length }=l\\)<br/>
\\(\text{Distance to point }d=\sqrt{x^2 + y^2}\\)<br/>
\\(\text{Angle to lookahead point }\alpha = \tan^{-1}(y/x)\\)<br/>
\\(\text{Curvature radius }R = \frac{d}{2\sin \alpha}\\)<br/>
\\(\text{Steering angle }\theta = \frac{l}{R}\\)<br/>
_The above figure illustrates computing the steering angle from the lookahead point. The algorithm is given the lookahead point \\((x, y)\\) and the distance \\(l\\) between the front and rear axles of the robot, or the *wheelbase length*, and the objective is to determine the steering angle \\(\theta\\) to turn in a smooth arc towards the lookahead point. As an intermediate calculation, the algorithm computes the radius of this arc, \\(R\\)._
</center>


# Implementation


The implementation contains five integrated components: map modifications, two path planners (RRT and Theta\*), the trajectory follower, and a particle filter localizer.


## Map modifications - Jerry, Kolby

We accounted for the size of the robot through morphological dilation, and we accounted for the presence of unmarked obstacles by modifying the provided map. Because the robot has size and is not simply a point, the robot may collide with an obstacle even when the center of the robot is a short distance away from the obstacle. Morphological dilation increases the size of all obstacles and walls, so the path planner will automatically stay a specified distance away. When a large obstacle is present which is not marked on the provided map, the path planner may choose a path which tries to go through the obstacle; the algorithm is not smart enough to go around the obstacle, and the robot is unable to reach our goal. We decided to take the simple measure of modifying the provided map to account for this.

### Dilating the Map to Account for Robot Size - Kolby
The impassable features on the map were dilated by 60cm to account for the fact that the robot is not a point, which is important because path planners, especially Theta\*, may produce paths which go very close to the wall. Furthermore, the Pure Pursuit algorithm cuts corners by nature, which can lead to a collision if the planned trajectory is very close to a corner. If the path planner thinks the obstacles and walls are thicker than they actually are, then the path returned should allow the robot to track the trajectory without hitting corners or obstacles. A map of Stata basement with this dilation is shown below, in Figure 7.

<center>**Figure 7: Dilated Map of Stata Basement**<br/>
![Dilated Map of Stata Basement](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/dilated_map.jpg =325x430)<br/>
The above figure shows the resulting map  from dilating the impassable regions in the Stata basement map by \\(0.6m\\). This is actually the dilated version of the map after it was manually edited to account for obstacles (see Figure 8 below).

</center>

### Manually Editing the Map to Account for Obstacles - Jerry

Large unmarked obstacles in the Stata basement often prevented the robot from reaching the goal point, which led us to mark these obstacles on the map. All the unmarked obstacles were against the wall of the basement, and protruded from the wall by about a meter. Despite their unobtrusiveness, these obstacles often prevented our robot from reaching its destination because Theta\* generates the shortest path which is often very close to the wall, and therefore goes through these obstacles. We originally tried to apply morphological dilation to simply thicken the walls past the obstacles; however, we found that we had to use a dilation radius of 1.5 meters, which led some narrow corridors to be nearly or completely impassable. We finally realized that we could simply edit the provided map (see Figure 8 below); we made crude modifications in GIMP to mark the approximate locations of the obstacles, which allowed the robot to avoid them.


<center>**Figure 8: Original (Left) and Hand-modified (Right) Stata basement map.**<br/>
![Comparision of Maps](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/maps_compared.PNG =750x450)<br/>
_The above figure shows the enhancements to the TA-provided map of the Stata basement. We used GIMP to draw in obstacles by hand in the corridor on the left (circled in red)._
</center>

## Path Planning - Ravi/Sabina

### RRT - Ravi
The final implementation of RRT uses uniform random sampling over all possible positions, \\(1500\\) vertices, and examines 10 nearest poses for random sample (and 60 nearest poses for the goal). With these settings, RRT found paths in \\(33.44s\\) \\((\sigma = 43.33s))\\) with a \\(70\%\\) success rate over \\(10\\) randomized trials (failed trials timed out at 120 seconds). These settings maximized the success rate and resulted in smooth paths while minimizing computation time.

Bridge sampling, a method that picks unobstructed points surrounded by obstacles, failed to identify necessary waypoints, so we did not use this technique. Bridge sampling constructs a bridge over the sample, and checks to see if the "supports" are passable grid squares. While this method ignores examining unnecessary waypoints in free space, it also fails to identify waypoints at "T"-shaped intersections. These waypoints would be necessary to make the robot turn before the end of a hallway.


<center>**Figure 9: Intersections where Bridge Sampling Worked (Green) and Failed (Orange)** <br/>
![Intersections where Bridge Sampling Worked and Failed](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/bridge_error.PNG =300x390)<br/>

*The above figure shows how bridge sampling would examine the green sample and discard the orange sample. The green sample's bridge intersects the boundry, whereas the orange's sample bridge is completely within the navigatable space. The blue dot represents the current robot position. The black line represents a found path. Therefore, it is unlikely the robot will take the first right turn.* </center>


Instead of bridge sampling, uniform sampling with parent traversal found efficient paths. Uniform sampling could construct paths that backtrack or unnecessarily loop in free space. To avoid this pitfall, parent traversal connects each sample with the most senior navigable ancestor of the closest vertices. This optimization eliminates inefficient paths in free space (the primary benefit of bridge sampling) while also exploring all paths in the map.


A navigable circular trajectory required a minimum turn radius of \\(1.5m\\), measured by the sharpest curve the RACECAR could sustain, along with an obstacle-free trajectory on the dilated map. Map cells every \\(\frac{2.0}{r}\\) units along the trajectory were checked for obstacles.


Paths between the start pose and destination point were scored by averaging the square of the turn radius, weighted by the circumference of the turn. This heuristic prioritized smoother paths, which the robot could then follow at higher speeds.


<center>**Figure 10: Simulated RRT Path Planning**<br/>
![Intersections where Bridge Sampling Worked and Failed](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/rrt.png =390x490)<br/>
*The above figure shows the RRT-found path (green) between the start and end vertices. It took 48 seconds to find this path. Observe that RRT preferred using the top hallway over using the middle hallway because the turns required are smoother.*</center>

### Theta\* - Sabina

Theta\*, an A*-based search algorithm, computes any-angle shortest paths in a discrete grid by relaxing neighbor constraints, applying heuristics to bias search nodes, and checking for line-of-sight between nodes.

#### Using Euclidean Distance as the Search Heuristic

Theta\* prioritizes which paths to explore by favoring lower cost nodes, which is calculated by adding the Euclidean distances between nodes along the shortest-cost path. Node costs are calculated by recursively summing the Euclidean distances between the parent and child nodes between the current node and the start node, and then adding the Euclidean distance between the current node and the goal node. The node costs are then added into a priority queue, which is then used to select the lowest cost node to explore. By exploring the lowest cost node first, Theta\* prioritizes paths that seem to be leading closer to the goal.

#### Checking In-Line-of-Sight to Reduce Number of Waypoints in the Path

In-line-of-sight allows Theta\* to simplify the path by discarding intermediate nodes, by checking whether the line between any two nodes contains any obstacles. It does this by stepping along the direct path between the two nodes and checking if any intervening cells contain obstacles. Waypoints are only created to connect paths with direct line of sight between nodes, thereby reducing the number of intermediate points between the start and end node. See Figure 3 (Theta\* Optimization) above for a visual representation of waypoint selection. The linear trajectory between waypoints are subdivided into many linear segments, so the overall best trajectory is returned as a piecewise linear path to be used in Trajectory Tracking.

#### Visualization

The implementation of Theta\* publishes several visualization messages. The start and end points are selected using Pose Estimate and Nav Goal tools respectively on rviz. The start point is visualized as a green sphere, and the goal point is visualized as a red sphere. The nodes searched via the search algorithm are visualized as small grey dots. As shown by the expansion direction of the grey dots, the Theta\* heuristic successfully biases the search area towards the goal point. The final trajectory path (blue line) is shown via blue segments drawn between “waypoints” (red dots) along the path.

<center>**Figure 11: Sample Run of Theta\***<br/>
![Sample Run of Theta\*](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/thetastarpath.png =450x550)<br/>
*The above diagram illustrates a sample path from Theta\*. It took 7.47s to compute*</center>

#### Optimizing Theta Star

Vectorizing in\_line\_of\_sight, decreasing the map resolution, and removing the rviz visualization significantly increased the speed of the theta\* search algorithm. After profiling the code, we found that visualization alone takes up half the time of the theta\* script to run, so removing rviz visualization increases the overall search speed by 2x. Vectorizing the in\_line\_of\_sight function also showed a decrease in time, in particular changing the python for-loops to numpy arrays, because we found from profiling that in\_line\_of\_sight took the bulk of the execution time. The largest optimization involves decreasing the resolution of the map. Decreasing the resolution decreases the number of nodes needed to be searched by theta\*, thereby increasing the search speed of the path planner. We decreased the resolution of the map by a factor of 2, which decreases the number of grid cells in the map (and thus the search time) by a factor of 4. We chose the factor 2 as the minimum resolution decrease to achieve an acceptable runtime.

## Trajectory Tracking - Jerry, Kolby, Marek
The Pure Pursuit trajectory tracker was implemented according to the algorithm with few modifications. Our implementation used a fixed lookahead distance of \\(1.5\\) meters, assumed the wheelbase length was \\(0.25\\) meters, and published drive commands with a fixed forwards speed of \\(2.5\\) meters per second. These parameters were the default values in the skeleton code provided (with the exception of speed, which we increased in the interest of time); we found the trajectory tracker performed adequately with these parameters and we did not have time to tune them or to experiment with variable lookahead distance or forward speed.

Implementing Pure Pursuit with NumPy allowed it to run efficiently, far in excess of real time. The slowest part of the algorithm is where it finds the closest point on the trajectory to the robot's current location. This requires computing the distance from the robot to every line segment on the trajectory, which can be done efficiently using NumPy, even for trajectories which contain many line segments. In practice, however, the path planners Theta\* and RRT both tend to return trajectories with 20 or fewer segments, so this performance optimization turned out to be likely unnecessary. Empirically, the implementation was able to output a drive command within \\(0.01s\\) of receiving the robot's current pose from our localization algorithm, which is more than fast enough; our localization algorithm only publishes every \\(0.05s\\), the same rate as the Velodyne LIDAR sends new laser scans.

For ease of use and debugging, the implementation automatically halts once the goal point is reached, and publishes useful visualization messages. When the goal point is detected as being within \\(0.5m\\) of the robot, the implementation automatically resets and clears the trajectory being followed, until it receives a new trajectory. The implementation visualizes the closest point on the trajectory, a circle with the lookahead radius, the lookahead point itself, and the arc computed from the bicycle Ackermann model which Pure Pursuit follows to the lookahead point.


## Particle Filter Localization - Jerry

We used our particle filter implementation from Lab 5, with some modifications, as the localization algorithm for this lab. In lab 5, we were able to implement a particle filter which performed well in many scenarios, but it had some trouble with featureless hallways containing unmarked obstacles. The 6.141 staff provided an implementation of a particle filter, but we had some trouble getting it to run and it was tuned for a Hokuyo LIDAR and not our Velodyne LIDAR. Instead, we opted to read the staff implementation of the particle filter and use insights from it to improve our own particle filter.

We had previously determined shortcomings in the motion model of our particle filter, so we rewrote and simplified it based on the staff implementation of the particle filter. The full details of our modifications are beyond the scope of this paper, but the most important change was simplifying the motion model to use Gaussian noise with hardcoded standard deviation, instead of a mixture of Gaussian and log-normal noise with variance based on odometry data. In doing so, we noticed what we thought was a bug in the staff implementation, which we fixed in our own implementation: the staff implementation generated noise in the coordinate frame of the map, but our implementation generates it in the frame of the particles. This is important because the noise is not symmetric; the robot has more uncertainty in forward motion than lateral motion, so it makes sense to have a higher variance in the noise along the \\(x\\)-axis in the frame of the particles.

After making these changes, we performed additional parameter tuning to improve the accuracy of our localization in featureless hallways with unmarked obstacles. We found that due to the obstacles, the particles were failing to spread out adequately in the featureless hallway. We therefore increased the noise in both our motion model and the sensor model, which substantially improved accuracy.

## ROS Architecture - Jerry

The abbreviated ROS architecture, showing the entire pathway from the sensor inputs to the drive command outputs, is shown below in Figure 12.

  
<center>**Figure 12: Abbreviated ROS Architecture**<br/>
![Abbreviated ROS Architecture*](https://github.mit.edu/pages/rss2018-team12/assets/images/lab6/ros_architecture.jpg =450x500)<br/>
_This diagram shows the entirety of the pathway, from the sensor inputs to the drive commands issued to the motor. Each box represents a node; the arrows represent topics which nodes subscribe to or publish to. Some topic names have been omitted from the diagram for brevity. Where it is unclear what information is passed between nodes, the topics are labeled._</center>

## Evaluation

### Theta\* Was Faster and More Reliable - Ravi

Theta\* proved superior compared to RRT with its faster path computation (1.40s vs 33.44s), higher success rate (100% vs 70%), and shorter yet pursuable paths over 10 randomized, sample trials. As such, our final implementation used the Theta\* algorithm.

### Pure Pursuit Worked on Hand-made Trajectories - Ravi

Hand-crafted trajectories enabled testing of the trajectory tracker before the path planner was completely implemented. The `build\_trajectory` ROS node listens to the publish point topic from RVIZ, and saves the clicked points as ordered vertices in a polygon. This tool allows for manual path construction, which was used for preliminary testing of pure pursuit.

In preliminary testing of pure pursuit, we focused on qualitatively ensuring the algorithm was implemented correctly. We did not have time to tune parameters, therefore a more rigorous quantitative evaluation was not necessary at this stage. By visualizing each stage of Pure Pursuit and testing the trajectory tracker in simulation on a hand-crafted trajectory, we were able to verify that the trajectory tracker correctly identified and turned towards the lookahead point.


### Successful Testing in Simulation - Jerry

Once the path planner and trajectory tracker were both implemented, we integrated them together and tested them quantitatively and qualitatively in simulation. We tested the simulated robot's ability to find a path and drive to multiple goal points, both in clear open areas and in a crowded region with complex obstacles. We qualitatively verified that the paths were efficient and that the robot was appropriately moving towards the specified goal points. We also recorded how long it took for the path planner to compute the paths and the tracking error of the trajectory tracker. The average tracking error was computed by computing the average distance between the simulated robot's location, as determined by localization, and the closest point on the trajectory.

Our test results are shown in the video in Figure 13 below. The Theta\* path planning algorithm was able to compute paths through open space in negligible time, and was able to plan a path around a wall in 10 seconds. The tracking error was large overall, at 0.351 meters, but this is because at the beginning of each path, the robot was not oriented in the direction of the path. Once the robot converged onto the planned trajectory, the tracking error was only 0.068 meters.

Overall, we were satisfied by the ability of the integrated path planning and trajectory tracking algorithm to find and follow paths in simulation.

<center>

**Figure 13: Path Planning and Trajectory Tracking in Simulation**.
<iframe width="560" height="315" src="https://www.youtube.com/embed/C1fnWmCpJxk" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

_This video visualizes both the path planning process with the Theta\* algorithm and the trajectory tracking process with the Pure Pursuit algorithm, run in simulation. The Theta\* algorithm was able to efficiently find a path, and the Pure Pursuit algorithm was able to follow it with only minor deviations once it had converged onto the path from the start point._
</center>


### Successful Testing on the Robot - Jerry

We performed multiple test runs on the real robot in the Stata basement, with good results. We used the same metrics as those in simulation--measuring the time it took to compute the trajectory to the goal point as well as the tracking error. We performed a short test run across half the basement as well as two long test runs across the entire basement. The path for the short test run took 2.3 seconds to compute, and the path for the long test runs took 47.21 seconds and 22.9 seconds to compute. The tracking error for the short test run was 0.0437 meters, and the tracking errors for the long test runs were 0.101 and 0.0858 meters, respectively. Our video of the second long test run is in Figure 14 below.

We found that the length of time it takes for Theta\* to compute the trajectory is strongly dependent on the effectiveness of the heuristic, but the slowest runtime we found was still sufficiently fast. In an open space where the trajectory is directly towards the goal point, the heuristic is very effective and leads to a very rapid computation. In a space where the trajectory must go around a large obstacle, such as in the first test run, the heuristic is ineffective and the computation time is substantially longer. Overall, however, even 47.21 seconds is an acceptable runtime; we had budgeted around a minute to find the trajectory.

The observed tracking error is sufficiently low. A tracking error of around 0.1 meters, as was observed, is within the expected error from localization, especially considering 0.1 meters is less than the width of the robot.

<center>
    
**Figure 14: Path Planning and Trajectory Tracking on the Robot.**
<iframe width="560" height="315" src="https://www.youtube.com/embed/AkD9tCay0mQ" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

_This video shows one of our three test runs on the robot in the Stata basement. The robot first uses Theta\* to find the shortest path to the specified goal point in 22.9 seconds, then uses Pure Pursuit to follow the shortest path with an average tracking error of 0.0858 meters._
</center>


## Lessons Learned - Marek

Workflow changes can be rewarding but are not always successful. This week, we tried using a Markdown editor called StackEdit in order to reduce the workload of writing our labs. This editor was buggy and resulted in work loss and frustration. After momentarily reverting back to Google Docs, we discovered a realtime Markdown editor called HackMD that has been reliable and efficient. This has drastically reduced the work needed to typeset our labs on our website.

On a broader note, our team learned that there's a right tool for every job. Due to video creation taking Sabina significant time last week on iMovie, we've upgraded to Final Cut Pro. Although we tried morphological dilation to account for unmapped obstacles, Jerry was more effective using a simple image editor, Gimp. Overall, this lab has forced us to approach problems from various perspectives resulting in both simple and creative solutions.

## Future Work: Small Improvements to go a Long Way - Kolby


To make our robot more robust to various scenarios, we would like to implement dynamic lookahead and speed changes. Dynamic lookahead changes, in terms of pure pursuit, would allow us to shorten the lookahead distance around sharp turns but increase it on long and straight hallways. Dynamic speed changes would work in a similar fashion. 

We believe general improvements to our RRT algorithm are possible and plan to spend some time optimizing it, because RRT tends to produce navigable paths, which may be important for the race. Any reduction of the time necessary to plan a path, or an improvement in reliability of finding a path, would be a welcome improvement.
