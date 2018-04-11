Lab 5
=====

## Abstract - Ravi

Localization -- using sensor data and a map to determine pose (location and orientation) relative to an environment in real time -- enables high-speed path following. When the robot knows its pose, it can calculate its error relative to where it should be headed (e.g. a waypoint), and then move towards it. 

We developed a particle-filter and LIDAR-based localization module. Each particle represents a possible pose of the robot. For each particle, its initial pose and associated probability is drawn from a normal distribution centered at the robot’s known position and orientation. On each timestep, we update the poses of the particles using odometry data and the associated probabilities using LIDAR scan data. Finally, we publish the expected value of the particles as the robot's pose.

We initially tested on the simulator with \\(2400\\) particles and \\(54\\) laser samples per update at \\(40 hz\\) (\\(Δt = 0.025s\\)). We measured absolute average errors of \\(0.043m\\) for position and \\(0.017 rad\\) for orientation against odometry data, which is perfectly accurate in the simulator.

Next, we tested on the actual robot with \\(4000\\) particles and \\(72\\) laser samples per update at \\(20 hz\\) (\\(Δt = 0.05s\\)), the same frequency as the Velodyne LIDAR. We qualitatively measured that our method was accurate for \\(114\\) of the \\(120\\) second test run (\\(95\\%\\)).

These accuracy measurements indicate the reliability of particle filter localization and its likely usefulness in path following.
<br />
<br />

## Introduction - Ravi

We implemented a particle filter to perform localization--using sensor data with a map to determine the pose of the robot relative to the environment--in real time. Localization enables high-speed path following. When the robot knows its pose, it can then calculate its error relative to where it should be headed (i.e. a waypoint), and adjust its trajectory accordingly. We intend to use path following for the autonomous race. As such, we need fast and accurate localization.

## System Overview - Kolby

Our system consists of multiple interacting parts: sensory data, a map of Stata basement, a precomputed lookup table, and our particle filter algorithm, which uses the former parts to determine our most likely pose. The particle filter algorithm uses odometry messages to intuit how the robot has moved since the last time step. Laser scans from the LIDAR, along with the map and precomputed lookup table, are used in a submodule of the algorithm called RangeLibC to reassess the probability distribution associated with our location. The most likely pose is extracted from this distribution. This process is repeated, and can be seen in the figure below. 

<center>**Particle Filter Localization System Diagram**<br /><span>![Particle Filter Localization System Diagram](assets/images/lab5/SystemDiagram.png)</span></center>

<center>**Figure 6.1**: *Diagram illustrating an overview of our system architecture. The robot provides laser and odometry sensor data. Combining this data with a known map of the environment and the initial pose, the particle filter calculates an inferred pose for the robot. Odometry data is passed to RViz for visualization.*</center>


## Particle Filter Algorithm - Sabina

We first describe the particle filter in generality. Figure 6.2 provides an overview of the algorithm.

<center>**Particle Filter Pipeline**<br /><span>![Particle Filter Pipeline](assets/images/lab5/ParticleFilter.png)</span></center>

<center>**Figure 6.2**: *Diagram illustrating the steps of Particle Filter/Monte Carlo Localization. It first initializes the particles based on known robot location. Then, at each timestep, MCL: 1) resamples the particles based on the weights computed in the previous timestep, 2) moves each particle's pose using the motion model, and 3) updates each particle's weight using the sensor model.*</center>

### Initialization

In local initialization, which we assume for the purposes of this lab, the initial robot location is provided to the algorithm, which initializes particles near this robot location. In order to be robust to errors in the initial robot location, the algorithm initializes the particles with some noise instead of using the exact provided robot location.

### Resampling Particles

At the beginning of each timestep, the algorithm samples a new batch of particles based on the weights of the particles computed in the previous timestep. This allows the filter to discard particles deemed to be unlikely, which will not be resampled. Note that the newly resampled particles have uniform weight; the weights in the previous timestep are now reflected in the frequencies of the resampled particles.

### Motion Model

After particles are resampled, the motion model takes the odometry data from the wheels of the robot, calculates the pose displacement, and applies the displacement as well as random noise to each particle pose. The pose displacement can be calculated by comparing the odometry between the current and previous timesteps. Following a Monte Carlo approach, each particle is translated using this displacement, then perturbed with random noise. See **Using Randomness to Account for Noise in Odometry** section in **Particle Filter Implementation** for more implementation details.

### Sensor Model

After the motion model updates the poses of each particle, the algorithm uses a sensor model to update the particle weights given the measured laser scan data and a provided map. First, raycast is performed from each particle in the map to determine the ground truth observations we would expect from the particle's pose. The algorithm randomly samples a subset of the laser measurements and computes the probability based on the sensor model that each particle observed these measurements based on the ground truth distances from raycasting . By Bayes's Rule, since the particles all have uniform probability (due to resampling), the probability that a particle observes the measured laser scan data is the same as the probability, given the laser scan data, that the particle reflects the true pose of the robot. The algorithm then assigns these probabilities as the weights of each particle. See the **Accounting for Laser Scan Noise with our Sensor Model** section in **Particle Filter Implementation** for more implementation details.

## Particle Filter Implementation - Jerry

This section how we, when implementing the particle filter, a) modeled the random noise in initialization as well as the motion and sensor models, b) wrote efficient code, and c) iteratively chose the number of particles and laser measurement samples to use.

### Initializing Particles Given Approximate Initial Position
When our algorithm receives an initial pose or initial position from either the `/initial_pose` or the `/clicked_point` topics, respectively, we initialize our particles around this pose or point in a normal distribution. The position of the particles are sampled from a normal distribution centered at the received position and a \\(1\\) meter standard deviation (chosen arbitrarily). If an `/initial_pose` is provided, the orientation of the particles are sampled from a normal distribution from the received orientation. Alternatively, if given a `/clicked_point`, the orientation of the particles are distributed uniformly in a circle. This initialization method creates a particle filter robust to errors in the initial location and orientation. An example of initialization can be seen in Figure 6.3 below. We made no attempt at global initialization; in the absence of an initial pose or point, all particles are initialized to \\((0, 0)\\).

<br />
<br />
<center>**Particle Filter Local Initialization**<br /><span>![Particle Filter Local Initialization](assets/images/lab5/InitialParticles.png)</span></center>
<center>**Figure 6.3**: *Screenshot showing the initial poses (red vectors) after clicking a location in RViz. Positions were drawn from a normal distribution centered at the clicked point and with a standard deviation of \\(1m\\). Orientations were drawn from a uniform distribution.*
</center>
### Using Randomness to Account for Noise in Odometry

As a part of the particle filter algorithm, we use a Monte Carlo approach to account for noise in the odometry measurements. We use randomness when choosing the change in distances and angles.

For each particle, we independently select the distance to move the particle from a log-normal distribution or normal distribution. We draw the distance to move each particle from a log-normal distribution if the odometry data indicates the robot is moving, or from a normal distribution if the odometry data indicates the robot is standing still. If the odometry indicates the robot is moving forward, we expect the robot is unlikely to be moving backwards; a log-normal distribution has no probability mass less than zero, reflecting this property. We determine the robot's movement direction by comparing the robot's change in position with the orientation reported by odometry. Figure 6.4 provides the equations we use for these calculations.

<center>**Distance Formulas**</br><span>![Distance Formulas](assets/images/lab5/DistanceFormulas.png)</span></center>

<center>**Figure 6.4**: *How we draw the distances \\(d\\) to move each particle from the odometry data. The odometry data provides us with a pose \\((x, y, \theta)\\) (computed from dead reckoning) and a covariance matrix \\(\Sigma\\). From the pose, we compute \\(\Delta x, \Delta y\\), the differences in the \\(x\\) and \\(y\\) coordinates from the previous reported pose. These allow us to determine the direction and distance of movement, and we estimate the noise using \\(\Sigma\\). We then draw the distances to move each particle based on these computations.*</center>

We sample the angle to rotate each particle from a normal distribution centered on the angle change reported by the odometry. The covariance matrix reported by odometry provides standard deviation measurements. We scale these values by \\(1.5\\) (determined by testing against the autograder), clamped at an upper bound of \\(0.5 rad\\). We chose this clamping value because it is very improbable for the sampled noise to be \\(\pi\\), which can cause the inferred pose to spontaneously reverse direction in the middle of a long hallway.

Figure 6.5 provides an example of the complete pose updating process.

<center><span>![Motion Model](assets/images/lab5/MotionModelDiagram.png)</span></center>

<center>**Figure 6.5**: *For each particle we draw the distance to move the particle from a log-normal distribution and the angle to rotate the particle from a normal-distribution, with parameters selected based on the odometry sensor data. Each particle is translated by the selected distance in the direction the particle was facing, and then rotated by the selected angle. If the robot is detected as not moving or moving backwards, the distance is instead drawn from a normal distribution or negative log-normal distribution instead (not shown).*</center>

### Accounting for Laser Scan Noise with our Sensor Model

Following the lab handout, we construct a 4-part sensor model to specify the probability of measuring a distance \\(r\\) with the laser given a ground truth distance \\(d\\), because noise or unexpected obstacles can cause the laser to not report the true distance.

   1. We represent the possibility that the laser may measure the correct distance, but with some noise, using a Gaussian centered at \\(d\\), of standard deviation \\(4 px \approx 20cm\\).
   2. We represent the possibility the laser may hit an intervening unknown obstacle, with a sloped line where the probability of measuring distance \\(0\\) is half the peak height of the Gaussian in part 1, and the probability decreases linearly to \\(0\\) at the ground truth distance \\(d\\).
   3. We represent the possibility the laser may miss or reflect, assigning a probability \\(0.08\\) to the maximum possible measurement. 
   4. We represent the possibility of a random measurement, assigning a total probability of \\(0.05\\) to this case.

We add all these components together to compute the total probability of measuring a distance \\(r\\). This probability is then "squashed" to the power of \\(\frac{12}{num\\\_laser\\\_samples}\\), where \\(num\\\_laser\\\_samples\\) is the number of laser measurements we make from each particle. The squashing exponent comes out to \\(\frac{1}{6}\\) for 72 samples. Squashing ensures that if many laser measurements all report related errors, e.g. due to many laser measurements hitting the same unexpected obstacle, it does not too strongly impact our particle weights. All parameters used in our sensor model were hand-tuned to optimize for score on the autograder; we did not find it necessary to re-tune them for the real robot. Figure 6.6 provides a visualization of our final, normalized sensor model.

<center>**Sensor Model Visualization**</br><span>![Sensor Model Visualization](assets/images/lab5/SensorModelVisualization.png =528x417)</span></center>

<center>**Figure 6.6**: *Our precomputed sensor model (after squashing and normalization), showing the probability of measuring a distance given the ground truth distance.*</center>

### Efficient Implementation with RangeLibC on the GPU

We used the `rangelibc` library with GPU enabled to write an efficient implementation of the particle filter, allowing us to support larger numbers of particles and take more laser samples in real time. In our original implementation, we used `rangelibc`'s `calc_range_repeat_angles` function to perform fast raycasting, and we precomputed the sensor model and used `rangelibc`'s `eval_sensor_model` function to evaluate the sensor model very quickly. Even so, we found our code was slower than we wanted, and we were only able to support about \\(1000\\) particles at \\(40 Hz\\). We tried to run `cProfile` to determine where the bottleneck was in our code, but it reported only that most of the time was spent asleep. Instead, we manually used Python's `time.time()` function to determine how long we spent on each portion of the code, and realized the bulk of our time was spent raycasting. We switched the range method from `cddt` to `rmgpu`, so that `rangelibc` would take advantage of the GPU on the robot, which enabled our code to support \\(2400\\) particles at \\(40 Hz\\). However, raycasting is still the slowest part of our code.

### Number of Particles vs Laser Scans

There is a performance tradeoff where using more particles or sampling more laser measurements gives better results from the particle filter at the cost of speed; we chose how many particles and sampled laser measurements to use to maximize empirical accuracy at the minimum required speed. The time cost of raycasting, which is the slowest component of our code, scales with \\(O(|\text{particles}| * |\text{laser samples}|)\\). A slight error in the robot position can cause a big difference in the laser measurements, for example when there are complex obstacles arranged close together. Hence, it is important to use many particles to get as close to the true position as possible. Conversely, when there are relatively few features such as in a hallway, it is important to take many laser measurements in order to see the few features which exist so that the robot can determine which particles are the most likely. Originally, we tuned the particles \\(\times\\) laser measurements to run at \\(40Hz\\) on the autograder, then tried different ratios of particles to laser measurements, and found that \\(2400\\) particles and \\(54\\) laser measurement samples performs the best on the autograder. When we moved to working on the robot, because the Velodyne laser scanner only publishes at \\(20Hz\\), we were able to increase the number of particles to \\(4000\\) and number of laser samples to \\(72\\); these numbers were chosen to keep the proportions similar to those on the autograder.

## Evaluation - Ravi (Report and Lab); Marek (Lab)

### Initial Development and Autograding

We first ran the particle filter in simulation as a qualitative sanity check before optimizing our code for performance on the autograder. In simulation, we visualized the inferred pose of the robot and made sure it roughly tracked the true location of the robot given by the simulator itself. On the autograder, after various bug fixes and some parameter tuning, the best score we were able to get was \\(0.91\\), with \\(2400\\) particles and \\(54\\) laser measurement samples.

### Particle Filter Localization on Simulator: Our Algorithm Showed Great Performance

After autograding, we quantitatively evaluated our particle filter on the simulator, where the ground truth odometry is perfectly accurate and the laser data is not noisy. Hence, at each timestep, we computed the absolute difference between the inferred and actual position and the inferred and actual orientation. Evaluating on the simulator allows us to get a "best case" performance in a low-noise environment.

We first ran with \\(2400\\) particles and \\(54\\) laser measurement samples per update at \\(40 hz\\). We recorded average absolute error of:
   - Position: \\(0.043m\\)
   - Orientation: \\(0.017 rad\\)
   
This error is very low; for example, the position error is only a fraction of the width of the robot. 

After some experimentation on the actual robot, we increased the number of particles to \\(4000\\) and the number of laser measurement samples to \\(72\\). Because the computer we ran the simulation on had no GPU, we were only running at \\(10Hz\\) compared to the \\(20Hz\\) on the robot. We recorded error of:
   - Position: \\(0.092m\\)
   - Orientation: \\(0.0275 rad\\)
   
It is surprising that increasing the number of particles and laser measurement samples led to increased error; we attribute this to the decreased publish rate, which decreases granularity of the motion model's updates and may result in more error in the motion model.

Because these low error measurements would support path following, we did not attempt to optimize further. The performance of our particle filter ran in simulation can be seen in the video below in Figure 6.7.

<center>**Particle Filter Simulation**
<iframe width="560" height="315" src="https://www.youtube.com/embed/NIbuZocztWo" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></center>

<center>**Figure 6.7**: *The above video shows our particle filter localization running at \\(10hz\\) in a simulated environment. Red represents the inferred odometry; green represents the ground truth. The overlap illustrates the high level of accuracy of our implementation (average absolute error at each timestep: \\(0.093m\\))*</center>

### Particle Filter Localization in Robot: Generally Accurate, Diverges in Featureless Hallways
We then tested the particle filter running at \\(20hz\\) with \\(72\\) laser samples per update and \\(4000\\) particles on the actual robot. Unlike the simulator, we lacked a perfectly-accurate ground truth, so we could not quantitatively compute error. Instead, we measured that our method was qualitatively accurate for \\(114\\) of the \\(120\\)-second test run (\\(95\\%\\)). We noticed that the robot localized well in most situations, though the inferred pose diverged from the true pose of the robot in featureless hallways. Figure 6.8 is a video of the robot localizing while we drove it around the Stata basement during this test run. Figure 6.9 compares the inferred trajectory of the robot to a hand-drawn approximate actual trajectory of the robot where the localization briefly diverged from the true pose of the robot.

These accuracy measurements indicate the general reliability of particle filter localization and its likely usefulness with path following, though more work will need to be done to localize in featureless hallways.

<center>**Particle Filter on Robot**
<iframe width="560" height="315" src="https://www.youtube.com/embed/RobK9O0yZCo" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe></center>
<center>**Figure 6.8**: *The above video shows our particle filter algorithm running on the robot at \\(20 hz\\) with \\(72\\) laser samples per update and \\(4000\\) particles. The red path represents the inferred poses while the white dots represent laser scans. We qualitatively determined the filter was accurate for \\(114\\) of the \\(120\\) seconds (\\(95\\%\\)).*</center>

<center>**Inferred vs Actual Trail**<br /><span>![Inferred vs Actual Trail](assets/images/lab5/InferredActualTrail.png =450x450)</span></center>
<center>**Figure 6.9**: *This diagram shows the inferred trail in red in the area where the localization diverged in the test run shown in Figure 6.9, and compares it to a hand-drawn actual trail. We see that the localization overshot the corner but was otherwise correct.*</center>

## Lessons Learned: Tuning Noise is a Tall Task - Kolby, Marek

This lab required a lot of tuning and optimization, so most of our lessons resonate along those lines. For starters, we found that noise could be tricky to introduce into our model and had to be done so appropriately. Introducing too little or too much noise had direct implications on our performance. If we added too little, our robot was unable to recover after getting slightly off track. If we added too much, our robot would spontaneously turn around in the middle of a hallway. Related to this, we learned a lot about the importance of the laser scan and motion model information. When traveling down a long, uniform hallway, it was important for our motion model to be accurate as the laser scan data did little to tell us where we are. However, laser scan data was important for localizing in feature rich areas by helping us find the robots relation to corners and pillars. 

When it comes to optimizing the code, instrumentation and thinking deeply about how the code works is more effective than blindly changing parameters. A lot of time was spent arbitrarily changing parameters and running the simulation to see the change's effect, but it was not until we stopped to think about the code that considerable progress was made.

## Future Work: Speed and Robustness - Marek

To build upon our work on localization, we will attempt to make our particle filter run faster on the robot. Although it is currently running at our desired speed of 20hz, decreasing runtime will allow us to increase the number of laser scans and particles making our localization more accurate. In addition to decreasing runtime, our current noise models could be improved. Because of a bias in our current noise model, the robot's inferred pose moves faster than the actual robot. Although we are robust to this in the presence of features which help pin down the robot's location, improvements are desirable to decrease the likelihood of our localization failing in long, uniform hallways. As demonstrated in our video, our localization is relatively robust to random obstacles and deviations from the map. However, our robot struggled when approaching closed doors which otherwise appeared open on the map. While not strictly necessary for the race, being able to recognize closed doorways without confusing our localization would be a welcome improvement.
