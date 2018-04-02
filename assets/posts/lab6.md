Lab 6
=====

## General Overview and Approach - Ravi

Localization -- using sensor data and a map to determine pose (location and orientation) relative to an environment -- enables high-speed path following. When the robot knows its pose, it can calculate its error relative to where it should be headed, and then accurately navigate towards it. We intend to use path following for our final project, the autonomous race. As such, we need fast and accurate localization.

### Absrtract - Ravi

We developed a particle filter and LIDAR-based localization module. Each particle represents a possible pose of the robot. For each particle, its initial pose and associated probability is drawn from a gaussian distribution centered at the robot’s known position and orientation. On each timestep, we update the poses using odometry data with uncertainty and the associated probabilities using LIDAR scan data. Finally, we return the pose with the highest probability. 

We initially tested on the simulator with 2400 particles and 54 laser samples per update at 40hz (\\(\Delta t = 0.025s\\)). We measured absolute average errors of \\(0.043m\\) for position and \\(0.017 rad\\) for orientation against odometry data, which is perfectly accurate in the simulator.

Next, we tested on the actual robot with 4000 particles and 72 laser samples per update at 20hz (\\(\Delta t = 0.05s\\)), the same frequency of the Velodyne LIDAR. We measured that our method was qualitatively accurate for ______ of the 120 second test run (___%).

These accuracy measurements indicate the reliability of particle filter localization and its likely usefulness in path following and the high-speed race.

## Design and Implementation - Jerry, Kolby, Sabina

### System Overview - Kolby

Our system consists of multiple interacting parts: sensory data, a map of Stata basement, a precomputed lookup table, and our particle filter algorithm, which uses the former parts to determine our most likely pose. The particle filter algorithm uses odometry messages to intuit how the robot has moved since the last time step. Laser scans from the LIDAR, along with the map and precomputed lookup table, are used in a submodule of the algorithm called RangeLibC to reassess the probability distribution associated with our location. The most likely pose is extracted from this distribution, and then the whole process repeats.

### Particle Filter Algorithm - Sabina

#### Algorithm Overview

The particle filter algorithm, also known as the Monte Carlo Localization (MCL) algorithm, localizes the robot by maintaining a constant number of weighted “particles” to represent the possible poses of the robot in a given environment. These particles are updated at each timestep based on odometry and LIDAR data collected by the robot. At each timestep, the MCL does three things:
   1. It resamples the M particles based on the weights computed in the previous timestep
   2. It updates each particle's pose using the motion model
   3. It updates each particle's weight using the sensor model.

#### Resampling

The algorithm resamples the M particles based on the weights computed in the previous timestep. Note that the newly resampled particles are all uniformly likely to be the robot at this point.

#### Motion Model

The motion model takes the given odometry data, calculates the pose displacement, and applies the displacement as well as random noise to each particle pose. First, the change in pose is calculated using odometry data taken from the wheels. Using dead reckoning, the linear displacement and angular change can be calculated by comparing the odometry between the current and previous timesteps. Random noise is then added to each of the particles based on the movement computed. See Implementation section for more implementation details. 

#### Sensor Model

The sensor model updates the particle weights given the collected laser scan data. First, raycast is performed on each particle to determine the ground truth. The ground truth is compared to the actual laser scan data using the sensor model lookup table. The sensor model outputs the probabilities of each particle actually observing the data. By Bayes, since the particles all have uniform probability (due to resampling), this output probability represents the updated weight of each particle. See Implementation section for more implementation details. 

### Implementation - Jerry

In this section, we discuss areas in which we used our discretion in implementing the particle filter--how we modelled the random noise in the motion and sensor models, how we wrote our code to run efficiently, and how we chose the number of particles and laser measurement samples to use.

#### Using Randomness to Account for Noise in Odometry

As a part of the particle filter algorithm, we use a Monte Carlo approach to account for noise in the odometry measurements, in which we use randomness when choosing the distance and angle each particle moves by. For each particle, we independently select the distance to move the particle from a log-normal distribution or normal distribution, and select the angle to rotate the particle from a Gaussian distribution, both centered based on the data from odometry. Once we select the distance and angle to move each particle by, we move the particles by the chosen distance in the direction each particle was previously facing, then we rotate each particle by the chosen angle. See [FIGURE] for a visualization.

[INSERT FIGURE]

We draw the distance to move each particle from a log-normal distribution if the odometry data indicates the robot is moving, or from a normal distribution if the odometry data indicates the robot is standing still. This is because we expect that if the odometry indicates the robot is moving forward, the robot is unlikely to actually be moving backwards; a log-normal distribution has no probability mass less than zero, reflecting this property. We determine the direction the robot is moving by comparing the direction of movement reported by the odometry to the robot's facing angle determined by the odometry. The formulas we use to determine the distance to move each particle are in [FIGURE].

<center><span>![Distance Formulas](assets/images/lab6/DistanceFormulas.png =800x500)</span></center>

<center>**Figure NUM: How we draw the distances \\(d\\) to move each particle from the odometry data. The odometry data provides us with a pose \\((x, y, \theta)\\) (computed from dead reckoning) and a covariance matrix \\(\Sigma\\). From the pose, we compute \\(\Delta x, \Delta y\\), the differences in the \\(x\\) and \\(y\\) coordinates from the previous reported pose. These allow us to determine the direction and distance of movement, and we estimate the noise using \\(\Sigma\\). We then draw the distances to move each particle based on these computations.**</center>

We draw the angle to rotate each particle simply from a normal distribution centered on the angle change reported by the odometry, with standard deviation given by the covariance matrix reported by the odometry, but increased by a factor of 1.5 (which we determined testing with the autograder). However, sometimes this noise is too much; we clamp the standard deviation of the Gaussian with an upper bound of 0.5 radians, chosen so that it is very improbable for the noise to be \\(\pi\\), which can cause the inferred pose to spontaneously reverse direction in the middle of a long hallway.

#### Accounting for Laser Scan Noise with our Sensor Model

Following the lab handout, we construct a 4-part sensor model to specify the probability of measuring a distance \\(r\\) with the laser given a ground truth distance \\(d\\), because noise or unexpected obstacles can cause the laser to not report the true distance.

   1. We represent the possibility that the laser may measure the correct distance, but with some noise, using a Gaussian centered at \\(d\\), of standard deviation 4 pixels (about 20cm).
   2. We represent the possibility the laser may hit an intervening unknown obstacle, with a sloped line where the probability of measuring distance 0 is half the peak height of the Gaussian in part 1, and the probability decreases linearly to 0 at the ground truth distance \\(d\\).
   3. We represent the possibility the laser may miss or reflect, assigning a probability \\(0.08\\) to the maximum possible measurement. 
   4. We represent the possibility of a random measurement, assigning a total probability of \\(0.05\\) to this case.

We add all these components together to compute the total probability of measuring a distance \\(r\\). This probability is then "squashed" to the power of \\(12/ `num\_laser\_samples`\\), where `num\_laser\_samples` is the number of laser measurements we make from each particle, which comes out to about \\(1/6\\). This is so that if we take many laser measurements which all report related errors, e.g. due to many laser measurements hitting an unexpected obstacle, it does not too strongly impact our particle weights. All parameters used in our sensor model were hand-tuned to optimize for score on the autograder.

[INSERT IMAGE of sensor model visualization]

#### Efficient Implementation with RangeLibC on the GPU

We used the rangelibc library with GPU enabled to write an efficient implementation of the particle filter, allowing us to support larger numbers of particles and take more laser samples in real time. In our original implementation, we used the calc\_range\_repeat\_angles function from rangelibc in order to perform fast raycasting, and we precomputed the sensor model and used rangelibc's eval\_sensor\_model function to evaluate the sensor model very quickly. Even so, we found our code was slower than we wanted, and we were only able to support about 1000 particles at 40 Hz. We tried to run cProfile to determine where the bottleneck was in our code, but it reported only that most of the time was spent asleep, and did not report any useful information. Instead, we manually used Python's time.time() function to determine how long we spent on each portion of the code, and realized the bulk of our time was spent raycasting. We switched the range method from cddt to rmgpu, so that rangelibc would take advantage of the GPU on the robot, which sped our code up enough to support 2400 particles at 40Hz, though raycasting is still the slowest part of our code.

#### Number of Particles vs Laser Scans

There is a performance tradeoff where using more particles or sampling more laser measurements gives better results from the particle filter at the cost of speed; we chose how many particles and sampled laser measurements to use to maximize empirical accuracy at the minimum required speed. The time cost of raycasting, which is the slowest component of our code, is proportional to the number of particles times the number of laser samples. When a slight error in the robot position can cause a big difference in the laser measurements, for example when there are complex obstacles arranged close together, it is important to use many particles to get as close to the true position as possible. Conversely, when there are relatively few features such as in a hallway, it is important to take many laser measurements in order to see these features so that the robot can determine which particles are the most likely. Originally, we tuned the particles \\(\times\\) laser measurements to run at 40Hz on the autograder, then tried different ratios of particles to laser measurements, and found that 2400 particles and 54 laser measurement samples performs the best on the autograder. When we moved to working on the robot, because the Velodyne laser scanner only publishes at 20Hz, we were able to increase the number of particles to 4000 and number of laser samples to 72; these numbers were chosen to keep the proportions similar to those on the autograder and were not tuned.

## Evaluation - Marek, Ravi

[VIDEO of particle filter running on simulator]

<center>Figure _: The above video shows our particle filter localization running at 10hz in a simulated environment. Red represents the inferred odometry; green represents the ground truth. The overlap illustrates the high level of accuracy of our implementation (average absolute error at each timestep: 0.093m)</center>

We first evaluated our particle filter on the simulator, where the ground truth odometry is perfectly accurate. Hence, at each timestep, we could compute the absolute difference between the inferred pose and the actual pose.

When running at 10 hz with 4000 particles and 72 laser samples per timestep, we recorded error of:
   - Position: \\(0.092m\\)
   - Orientation: \\(0.0275 rad\\)
   
We then increased the frequency to 40 hz and reduced the number of particles and laser samples to 2400 and 54, respectively, per update. This reduced absolute average error to:
   - Position: \\(0.043m\\)
   - Orientation: \\(0.017 rad\\)

Because these low error measurements would support path following, we did not attempt to optimize further. 

[VIDEO of particle filter running on robot]

<center>Figure _: The above video shows our particle filter algorithm running on the robot at 20 hz with 72 laser samples per update and 4000 particles. The red path represents the inferred poses while the white dots represent laser scans. We qualitatively determined the filter was accurate for __ of the 120 seconds (__%).</center>

We then tested particle filter running at 20hz with 72 laser samples per update and 4000 particles on the actual robot. Unlike the simulator, we lacked a perfectly-accurate ground truth, so we could not quantitatively compute error. Instead, we quantitatively measured that our method was qualitatively accurate for ______ of the 120 second test run (___%).

These accuracy measurements indicate the reliability of particle filter localization and its likely usefulness in path following.

## Lessons Learned - Kolby, Marek

This lab required much tuning and testing, so most of our conclusions resonate along those lines. For starters, we found that noise could be tricky to introduce into our model and had to be done so appropriately. Introducing too little or too much noise had direct implications on our performance, such as being unable to recover after getting slightly off track or spontaneously turning around in the middle of a hallway. Related to this, when the laser data is noisy, it is important that the motion model is correct; when the laser data is noisy and the motion model is not correct, the inferred position can be wildly unpredictable, especially in the presence of unmapped obstacles. 

When it comes to testing, instrumentation and thinking deeply about how the code works is more effective than blindly changing parameters. A lot of time was spent arbitrarily changing parameters and running the simulation to see the change's effect, but it was not until we stopped to think about the code that considerable progress was made. Also when testing, it is important to understand the testing procedure. For example, the rosbags that we first collected ended up not being useful because we neglected to record the robot's starting location.

## Future Work - Marek

As is usually the case with coding and algorithms, we can strive to make our particle filter algorithm more efficient. We tried to vectorize as much as we could with numpy, but there were still some sections that we had to implement relatively inefficiently using for-loops. Additionally, our models for noise are a bit hacky. We added noise to our motion model using a Gaussian, the parameters of which were essentially guess-and-checked. Furthermore we took the lognormal of these values which resulted in a mean that was slightly off. In the future we would like to experiment with potentially more reasonable methods of factoring noise into our model. Finally, as mentioned earlier, we sometimes had sporadic behavior when the robot encountered an unmapped obstacle; detecting unmapped obstacles or deviations from the actual map is a challenge we would like to solve in order to improve our robot's performance.
